import { Router, Request, Response } from 'express';
import {
  createLeadSchema,
  updateLeadStageSchema,
  updateLeadSchema,
  assignLeadSchema,
  counsellorUpdateSchema,
  calculateLeadScore,
  isInQuietHours,
  normalizeEmail,
  normalizePhone,
  LeadStage,
} from '@team-b/shared';
import { store } from '../store/index.js';
import {
  ingestLead,
  generateDeterministicSummary,
  generateDeterministicCounsellorReply,
  routeLeadToCounsellor,
  analyzeLeadIntelligence,
  identifyConversionRecoveryLeads,
} from '../services/admissionsService.js';
import { authenticate, requireRole } from '../middleware/auth.js';
import { getPrisma } from '../prisma.js';
import { logger } from '../logger.js';

const router = Router();

// POST /api/leads (Public or staff ingestion)
router.post('/leads', async (req: Request, res: Response) => {
  const parsed = createLeadSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      success: false,
      error: 'Invalid lead submission data',
      details: parsed.error.issues,
    });
  }

  const result = await ingestLead(parsed.data, req.user?.email || 'PUBLIC_FORM');

  // Sync to PostgreSQL if Prisma is connected
  const prisma = getPrisma();
  if (prisma && result.lead) {
    try {
      const stageEnum = (result.lead.stage || 'New').replace(/ /g, '_');
      await prisma.lead.upsert({
        where: { id: result.lead.id },
        update: {
          studentName: result.lead.studentName,
          email: result.lead.email,
          phone: result.lead.phone,
          courseInterest: result.lead.courseInterest,
          stage: stageEnum as any,
          score: result.lead.score,
          scoreCategory: result.lead.scoreCategory as any,
          assignedCounsellorId: result.lead.assignedCounsellorId || null,
        },
        create: {
          id: result.lead.id,
          studentName: result.lead.studentName,
          email: result.lead.email,
          phone: result.lead.phone,
          courseInterest: result.lead.courseInterest,
          source: (result.lead.source || 'WEB_FORM') as any,
          stage: stageEnum as any,
          score: result.lead.score,
          scoreCategory: result.lead.scoreCategory as any,
          assignedCounsellorId: result.lead.assignedCounsellorId || null,
          freeTextInterests: result.lead.freeTextInterests || null,
          aiSummary: result.lead.aiSummary || null,
          communicationConsent: Boolean(result.lead.communicationConsent),
          optedOut: Boolean(result.lead.optedOut),
        },
      });
    } catch (dbErr) {
      logger.warn({ err: dbErr }, 'Failed to persist ingested lead to PostgreSQL, saved in memory store');
    }
  }

  return res.status(201).json({
    success: true,
    lead: result.lead,
    isDuplicate: result.isDuplicate,
    duplicateReason: (result as any).duplicateReason,
    routing: (result as any).routing,
  });
});

// GET /api/leads (Protected)
router.get('/leads', authenticate, async (req: Request, res: Response) => {
  const { stage, scoreCategory, counsellorId, search, source } = req.query;
  const prisma = getPrisma();
  let leads: any[] = [];

  if (prisma) {
    try {
      const where: any = {};
      if (stage) {
        const stageMapped = String(stage).replace(/ /g, '_');
        where.stage = stageMapped;
      }
      if (scoreCategory) {
        where.scoreCategory = String(scoreCategory);
      }
      if (counsellorId) {
        where.assignedCounsellorId = String(counsellorId);
      }
      if (source) {
        where.source = String(source);
      }
      if (search) {
        const q = String(search).trim();
        where.OR = [
          { studentName: { contains: q, mode: 'insensitive' } },
          { email: { contains: q, mode: 'insensitive' } },
          { phone: { contains: q } },
          { courseInterest: { contains: q, mode: 'insensitive' } },
        ];
      }

      const dbLeads = await prisma.lead.findMany({
        where,
        orderBy: { createdAt: 'desc' },
      });

      // Normalize stage for frontend
      leads = dbLeads.map((l: any) => ({
        ...l,
        stage: l.stage.replace(/_/g, ' '),
      }));
    } catch (dbErr) {
      logger.warn({ err: dbErr }, 'Failed to fetch leads from PostgreSQL, falling back to memory store');
      leads = [];
    }
  }

  // Fallback to in-memory store if DB query returned nothing or DB is offline
  if (leads.length === 0) {
    let memLeads = store.getState().leads;
    if (stage) {
      memLeads = memLeads.filter((l) => l.stage === stage);
    }
    if (scoreCategory) {
      memLeads = memLeads.filter((l) => l.scoreCategory === scoreCategory);
    }
    if (counsellorId) {
      memLeads = memLeads.filter((l) => l.assignedCounsellorId === counsellorId);
    }
    if (source) {
      memLeads = memLeads.filter((l) => l.source === source);
    }
    if (search) {
      const q = (search as string).toLowerCase();
      memLeads = memLeads.filter(
        (l) =>
          l.studentName.toLowerCase().includes(q) ||
          l.email.toLowerCase().includes(q) ||
          l.phone.includes(q) ||
          l.courseInterest.toLowerCase().includes(q)
      );
    }
    leads = memLeads;
  }

  return res.json({
    success: true,
    leads,
    total: leads.length,
  });
});

// POST /api/leads/check-duplicate
router.post('/leads/check-duplicate', async (req: Request, res: Response) => {
  const { email, phone } = req.body;
  if (!email && !phone) {
    return res.status(400).json({
      success: false,
      error: 'Either email or phone is required to check duplicates',
    });
  }

  const normalizedEmail = email ? normalizeEmail(email) : '';
  const normalizedPhone = phone ? normalizePhone(phone) : '';

  const match = store.getState().leads.find(
    (l) => (normalizedEmail && l.email === normalizedEmail) || (normalizedPhone && l.phone === normalizedPhone)
  );

  if (match) {
    return res.json({
      success: true,
      isDuplicate: true,
      matchType: match.email === normalizedEmail ? 'EMAIL_MATCH' : 'PHONE_MATCH',
      lead: {
        id: match.id,
        studentName: match.studentName,
        stage: match.stage,
        score: match.score,
        createdAt: match.createdAt,
      },
    });
  }

  return res.json({
    success: true,
    isDuplicate: false,
  });
});

// GET /api/leads/recovery (Conversion recovery candidates)
router.get('/leads/recovery', authenticate, (req: Request, res: Response) => {
  const recoveryList = identifyConversionRecoveryLeads();
  return res.json({
    success: true,
    total: recoveryList.length,
    recoveryLeads: recoveryList,
  });
});

// GET /api/leads/recovery/conversion-recovery (Alias)
router.get('/leads/recovery/conversion-recovery', authenticate, (req: Request, res: Response) => {
  const recoveryList = identifyConversionRecoveryLeads();
  return res.json({
    success: true,
    total: recoveryList.length,
    recoveryLeads: recoveryList,
  });
});

// GET /api/leads/:id
router.get('/leads/:id', authenticate, (req: Request, res: Response) => {
  const lead = store.getState().leads.find((l) => l.id === req.params.id);
  if (!lead) {
    return res.status(404).json({ success: false, error: 'Lead not found' });
  }

  const counsellor = store
    .getState()
    .counsellors.find((c) => c.id === lead.assignedCounsellorId);

  const assignments = store
    .getState()
    .leadAssignments.filter((a) => a.leadId === lead.id);
  const stageHistory = store
    .getState()
    .leadStageHistory.filter((s) => s.leadId === lead.id);
  const followUpTasks = store
    .getState()
    .followUpTasks.filter((t) => t.leadId === lead.id);
  const communicationLogs = store
    .getState()
    .communicationLogs.filter((c) => c.leadId === lead.id);

  return res.json({
    success: true,
    lead: {
      ...lead,
      assignedCounsellor: counsellor || null,
      assignments,
      stageHistory,
      followUpTasks,
      communicationLogs,
    },
  });
});

// PATCH /api/leads/:id (Update lead details)
router.patch('/leads/:id', authenticate, (req: Request, res: Response) => {
  const parsed = updateLeadSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      success: false,
      error: 'Invalid lead update parameters',
      details: parsed.error.issues,
    });
  }

  const lead = store.getState().leads.find((l) => l.id === req.params.id);
  if (!lead) {
    return res.status(404).json({ success: false, error: 'Lead not found' });
  }

  const data = parsed.data;
  if (data.email) data.email = normalizeEmail(data.email);
  if (data.phone) data.phone = normalizePhone(data.phone);

  Object.assign(lead, data);
  lead.updatedAt = new Date().toISOString();

  // Recalculate score if factors changed
  const scoreResult = calculateLeadScore({
    courseInterest: lead.courseInterest,
    preferredStartDate: lead.preferredStartDate,
    hasCommunicationConsent: lead.communicationConsent,
    preferredCounsellingTime: lead.preferredCounsellingTime,
    stage: lead.stage,
  });
  lead.score = scoreResult.total;
  lead.scoreCategory = scoreResult.category;
  lead.scoreDetails = scoreResult;

  store.logAudit({
    userId: req.user?.id,
    userEmail: req.user?.email,
    action: 'LEAD_UPDATED',
    entityType: 'Lead',
    entityId: lead.id,
    details: parsed.data,
  });

  return res.json({ success: true, lead });
});

// DELETE /api/leads/:id
router.delete('/leads/:id', authenticate, requireRole('ADMIN', 'ADMISSIONS_COUNSELLOR'), (req: Request, res: Response) => {
  const index = store.getState().leads.findIndex((l) => l.id === req.params.id);
  if (index === -1) {
    return res.status(404).json({ success: false, error: 'Lead not found' });
  }

  const [deletedLead] = store.getState().leads.splice(index, 1);

  // Cancel associated follow-up tasks
  const tasks = store.getState().followUpTasks.filter((t) => t.leadId === deletedLead.id);
  for (const t of tasks) {
    t.status = 'CANCELLED';
    t.notes = 'Lead deleted from database';
  }

  store.logAudit({
    userId: req.user?.id,
    userEmail: req.user?.email,
    action: 'LEAD_DELETED',
    entityType: 'Lead',
    entityId: deletedLead.id,
    details: { studentName: deletedLead.studentName, email: deletedLead.email },
  });

  return res.json({ success: true, message: 'Lead successfully deleted' });
});

// POST /api/leads/:id/score (Explicit score recalculation)
router.post('/leads/:id/score', authenticate, (req: Request, res: Response) => {
  const lead = store.getState().leads.find((l) => l.id === req.params.id);
  if (!lead) {
    return res.status(404).json({ success: false, error: 'Lead not found' });
  }

  const scoreResult = calculateLeadScore({
    courseInterest: lead.courseInterest,
    preferredStartDate: lead.preferredStartDate,
    hasCommunicationConsent: lead.communicationConsent,
    preferredCounsellingTime: lead.preferredCounsellingTime,
    stage: lead.stage,
  });

  lead.score = scoreResult.total;
  lead.scoreCategory = scoreResult.category;
  lead.scoreDetails = scoreResult;
  lead.updatedAt = new Date().toISOString();

  return res.json({
    success: true,
    leadId: lead.id,
    score: lead.score,
    scoreCategory: lead.scoreCategory,
    scoreDetails: lead.scoreDetails,
  });
});

// POST /api/leads/:id/ai-analyze (Module 3 AI Lead Intelligence)
router.post('/leads/:id/ai-analyze', authenticate, (req: Request, res: Response) => {
  const intelligence = analyzeLeadIntelligence(req.params.id);
  if (!intelligence) {
    return res.status(404).json({ success: false, error: 'Lead not found' });
  }
  return res.json({ success: true, intelligence });
});

// GET /api/leads/:id/intelligence (Alias)
router.get('/leads/:id/intelligence', authenticate, (req: Request, res: Response) => {
  const intelligence = analyzeLeadIntelligence(req.params.id);
  if (!intelligence) {
    return res.status(404).json({ success: false, error: 'Lead not found' });
  }
  return res.json({ success: true, intelligence });
});

// POST /api/leads/:id/stage
router.post('/leads/:id/stage', authenticate, (req: Request, res: Response) => {
  const parsed = updateLeadStageSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      success: false,
      error: 'Invalid stage update request',
      details: parsed.error.issues,
    });
  }

  const lead = store.getState().leads.find((l) => l.id === req.params.id);
  if (!lead) {
    return res.status(404).json({ success: false, error: 'Lead not found' });
  }

  const prevStage = lead.stage;
  const { stage, lossReason, note } = parsed.data;

  lead.stage = stage;
  lead.updatedAt = new Date().toISOString();
  if (lossReason) lead.lossReason = lossReason;

  // Record stage history
  store.getState().leadStageHistory.push({
    id: `sh-${Date.now()}`,
    leadId: lead.id,
    fromStage: prevStage,
    toStage: stage,
    changedBy: req.user?.email || 'SYSTEM',
    note: note || `Stage updated to ${stage}`,
    createdAt: new Date().toISOString(),
  });

  // Business Rule: If lead transitions to Enrolled or Lost, cancel any open follow-up tasks
  if (stage === 'Enrolled' || stage === 'Lost') {
    const openTasks = store
      .getState()
      .followUpTasks.filter((t) => t.leadId === lead.id && t.status === 'OPEN');
    for (const t of openTasks) {
      t.status = 'CANCELLED';
      t.notes = `Auto-cancelled due to lead transitioning to '${stage}' stage.`;
    }
  }

  // Recalculate score after stage change
  const scoreResult = calculateLeadScore({
    courseInterest: lead.courseInterest,
    preferredStartDate: lead.preferredStartDate,
    hasCommunicationConsent: lead.communicationConsent,
    preferredCounsellingTime: lead.preferredCounsellingTime,
    stage: lead.stage,
  });
  lead.score = scoreResult.total;
  lead.scoreCategory = scoreResult.category;
  lead.scoreDetails = scoreResult;

  store.logAudit({
    userId: req.user?.id,
    userEmail: req.user?.email,
    action: 'LEAD_STAGE_UPDATED',
    entityType: 'Lead',
    entityId: lead.id,
    details: { fromStage: prevStage, toStage: stage, lossReason },
  });

  return res.json({ success: true, lead });
});

// POST /api/leads/:id/assign
router.post('/leads/:id/assign', authenticate, (req: Request, res: Response) => {
  const parsed = assignLeadSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      success: false,
      error: 'Invalid assignment parameters',
      details: parsed.error.issues,
    });
  }

  const lead = store.getState().leads.find((l) => l.id === req.params.id);
  if (!lead) {
    return res.status(404).json({ success: false, error: 'Lead not found' });
  }

  const { counsellorId, manualOverride, reason } = parsed.data;

  if (counsellorId) {
    const target = store.getState().counsellors.find((c) => c.id === counsellorId);
    if (!target) {
      return res.status(404).json({ success: false, error: 'Target counsellor not found' });
    }
    if (!manualOverride && target.currentWorkload >= target.maxWorkload) {
      return res.status(400).json({
        success: false,
        error: `Counsellor ${target.name} is at maximum capacity (${target.currentWorkload}/${target.maxWorkload}). Enable manual override if intentional.`,
      });
    }

    // Decrement previous counsellor workload if assigned
    if (lead.assignedCounsellorId) {
      const prev = store.getState().counsellors.find((c) => c.id === lead.assignedCounsellorId);
      if (prev && prev.currentWorkload > 0) prev.currentWorkload -= 1;
    }

    target.currentWorkload += 1;
    lead.assignedCounsellorId = target.id;
  } else {
    // Unassign to fallback queue
    if (lead.assignedCounsellorId) {
      const prev = store.getState().counsellors.find((c) => c.id === lead.assignedCounsellorId);
      if (prev && prev.currentWorkload > 0) prev.currentWorkload -= 1;
    }
    lead.assignedCounsellorId = null;
  }

  lead.updatedAt = new Date().toISOString();

  store.getState().leadAssignments.push({
    id: `asgn-${Date.now()}`,
    leadId: lead.id,
    counsellorId: counsellorId || 'UNASSIGNED',
    assignedBy: req.user?.email || 'SYSTEM',
    reason: reason || (manualOverride ? 'Manual Counsellor Reassignment' : 'Direct Assignment'),
    createdAt: new Date().toISOString(),
  });

  return res.json({ success: true, lead });
});

// POST /api/leads/:id/ai-draft
router.post('/leads/:id/ai-draft', authenticate, (req: Request, res: Response) => {
  const lead = store.getState().leads.find((l) => l.id === req.params.id);
  if (!lead) {
    return res.status(404).json({ success: false, error: 'Lead not found' });
  }

  const counsellor = store.getState().counsellors.find((c) => c.id === lead.assignedCounsellorId);
  const counsellorName = counsellor ? counsellor.name : 'Admissions Team';

  const replyDraft = generateDeterministicCounsellorReply(
    lead.studentName,
    lead.courseInterest,
    counsellorName
  );
  const summaryDraft = generateDeterministicSummary(
    lead.studentName,
    lead.courseInterest,
    lead.freeTextInterests
  );

  return res.json({
    success: true,
    aiProvider: 'DETERMINISTIC_FALLBACK (DEMO MODE)',
    status: 'DRAFT',
    requiresApproval: true,
    summaryDraft,
    replyDraft,
  });
});

// GET /api/counsellors
router.get('/counsellors', authenticate, (req: Request, res: Response) => {
  const counsellors = store.getState().counsellors;
  return res.json({ success: true, counsellors });
});

// PATCH /api/counsellors/:id
router.patch('/counsellors/:id', authenticate, requireRole('ADMIN', 'ADMISSIONS_COUNSELLOR'), (req: Request, res: Response) => {
  const parsed = counsellorUpdateSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      success: false,
      error: 'Invalid counsellor updates',
      details: parsed.error.issues,
    });
  }

  const counsellor = store.getState().counsellors.find((c) => c.id === req.params.id);
  if (!counsellor) {
    return res.status(404).json({ success: false, error: 'Counsellor not found' });
  }

  Object.assign(counsellor, parsed.data);
  return res.json({ success: true, counsellor });
});

// GET /api/follow-ups
router.get('/follow-ups', authenticate, (req: Request, res: Response) => {
  const { counsellorId, status, leadId } = req.query;
  let tasks = store.getState().followUpTasks;

  if (counsellorId) {
    tasks = tasks.filter((t) => t.counsellorId === counsellorId);
  }
  if (status) {
    tasks = tasks.filter((t) => t.status === status);
  }
  if (leadId) {
    tasks = tasks.filter((t) => t.leadId === leadId);
  }

  const now = new Date();
  const enriched = tasks.map((t) => ({
    ...t,
    isOverdue: t.status === 'OPEN' && new Date(t.dueAt).getTime() < now.getTime(),
  }));

  return res.json({ success: true, tasks: enriched, total: enriched.length });
});

// POST /api/follow-ups/:id/complete
router.post('/follow-ups/:id/complete', authenticate, (req: Request, res: Response) => {
  const task = store.getState().followUpTasks.find((t) => t.id === req.params.id);
  if (!task) {
    return res.status(404).json({ success: false, error: 'Follow-up task not found' });
  }

  const lead = store.getState().leads.find((l) => l.id === task.leadId);
  if (!lead) {
    return res.status(404).json({ success: false, error: 'Associated lead not found' });
  }

  // Check consent & opt-out rules
  if (lead.optedOut) {
    task.status = 'CANCELLED';
    task.notes = 'Candidate has opted out of communication. Outreach stopped.';
    return res.status(400).json({
      success: false,
      error: 'Cannot complete outreach. Candidate has explicitly opted out of communications.',
    });
  }

  // Check quiet hours
  const inQuietHours = isInQuietHours(new Date(), store.getState().systemSettings.appTimezone);

  task.status = 'COMPLETED';
  task.completedAt = new Date().toISOString();
  task.notes = req.body.notes || 'Counsellor contact attempt completed';

  lead.lastContactedAt = new Date().toISOString();
  if (lead.stage === 'New') {
    lead.stage = 'Contacted';
  }

  // Record simulated outbound message
  store.getState().communicationLogs.push({
    id: `log-${Date.now()}`,
    leadId: lead.id,
    channel: 'WHATSAPP',
    recipient: lead.phone,
    direction: 'OUTBOUND',
    content: req.body.notes || 'Follow-up call/message conducted by admissions counsellor.',
    status: inQuietHours ? 'QUEUED_QUIET_HOURS' : 'SENT',
    isSimulated: true,
    createdAt: new Date().toISOString(),
  });

  // Schedule next follow-up delay if attempts < max (delays: +1, +3, +7 days)
  const maxAttempts = store.getState().systemSettings.maxFollowUpAttempts || 3;
  const intervals = store.getState().systemSettings.followUpDelaysDays || [1, 3, 7];

  if (task.attemptNumber < maxAttempts && !['Enrolled', 'Lost'].includes(lead.stage)) {
    const delayDays = intervals[task.attemptNumber] || 7;
    const nextDueDate = new Date(Date.now() + delayDays * 24 * 60 * 60 * 1000).toISOString();

    store.getState().followUpTasks.push({
      id: `task-fu-${Date.now()}`,
      leadId: lead.id,
      counsellorId: task.counsellorId,
      attemptNumber: task.attemptNumber + 1,
      dueAt: nextDueDate,
      scheduledAt: new Date().toISOString(),
      status: 'OPEN',
      notes: `Scheduled Follow-Up Attempt #${task.attemptNumber + 1} (+${delayDays} days)`,
      isOverdue: false,
      createdAt: new Date().toISOString(),
    });
  }

  return res.json({
    success: true,
    task,
    quietHoursActive: inQuietHours,
    simulated: true,
  });
});

// GET /api/admissions/analytics
router.get('/admissions/analytics', authenticate, async (req: Request, res: Response) => {
  const prisma = getPrisma();
  let leads: any[] = [];
  let counsellors: any[] = [];
  let followUps: any[] = [];
  let isDb = false;

  if (prisma) {
    try {
      const [dbLeads, dbCounsellors, dbTasks] = await Promise.all([
        prisma.lead.findMany(),
        prisma.counsellor.findMany(),
        prisma.followUpTask.findMany(),
      ]);
      leads = dbLeads.map((l) => ({
        ...l,
        stage: l.stage.replace(/_/g, ' '),
      }));
      counsellors = dbCounsellors;
      followUps = dbTasks;
      isDb = true;
    } catch {}
  }

  // Fallback to store if DB empty or unreachable
  if (leads.length === 0) {
    leads = store.getState().leads;
    counsellors = store.getState().counsellors;
    followUps = store.getState().followUpTasks;
  }

  const totalEnquiries = leads.length;
  const newUncontacted = leads.filter((l) => l.stage === 'New').length;
  const enrolled = leads.filter((l) => l.stage === 'Enrolled').length;

  // Numerator: Enrolled Leads / Denominator: Total Enquiries
  const conversionRate = totalEnquiries > 0 ? Math.round((enrolled / totalEnquiries) * 1000) / 10 : 0;

  // Source-wise conversion
  const sources = ['WEB_FORM', 'SIMULATED_WHATSAPP', 'INCOMING_CALL', 'REFERRAL', 'CSV_IMPORT', 'EXTERNAL_CAMPAIGN'];
  const sourceWise = sources.map((src) => {
    const totalSrc = leads.filter((l) => l.source === src).length;
    const enrolledSrc = leads.filter((l) => l.source === src && l.stage === 'Enrolled').length;
    const rate = totalSrc > 0 ? Math.round((enrolledSrc / totalSrc) * 1000) / 10 : 0;
    return {
      source: src,
      total: totalSrc,
      enrolled: enrolledSrc,
      conversionRate: rate,
    };
  });

  // Stage distribution
  const stageDistribution = [
    'New',
    'Contacted',
    'Counselling Booked',
    'Attended',
    'Application Started',
    'Enrolled',
    'Lost',
    'Nurture',
  ].map((st) => ({
    stage: st,
    count: leads.filter((l) => l.stage === st).length,
  }));

  // Score distribution
  const hotLeads = leads.filter((l) => l.scoreCategory === 'HOT' || l.score >= 70).length;
  const warmLeads = leads.filter((l) => (l.scoreCategory === 'WARM' || (l.score >= 40 && l.score < 70)) && l.scoreCategory !== 'HOT').length;
  const coldLeads = leads.filter((l) => l.scoreCategory === 'COLD' || l.score < 40).length;

  // Counsellor workload
  const counsellorWorkloads = counsellors.map((c) => ({
    id: c.id,
    name: c.name,
    currentWorkload: c.currentWorkload || 0,
    maxWorkload: c.maxWorkload || 25,
    capacityUtilizedPercent: Math.round(((c.currentWorkload || 0) / (c.maxWorkload || 25)) * 100),
    isAvailable: c.isAvailable ?? true,
  }));

  // SLA Compliance (follow-up tasks completed on or before dueAt)
  const completedTasks = followUps.filter((t) => t.status === 'COMPLETED');
  const onTimeTasks = completedTasks.filter((t) => t.completedAt && new Date(t.completedAt) <= new Date(t.dueAt));
  const slaCompliancePercent =
    completedTasks.length > 0 ? Math.round((onTimeTasks.length / completedTasks.length) * 100) : 100;

  // Follow-ups due today
  const now = new Date();
  const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
  const dueToday = followUps.filter(
    (t) => t.status === 'OPEN' && new Date(t.dueAt) <= todayEnd
  ).length;

  return res.json({
    success: true,
    storage: {
      mode: isDb ? 'postgresql-prisma' : 'in-memory-demo',
      persistent: isDb,
    },
    metrics: {
      totalEnquiries,
      newUncontacted,
      enrolled,
      conversionRate,
      conversionFormula: 'Enrolled Leads / Total Ingested Leads * 100',
      slaCompliancePercent,
      slaComplianceFormula: 'Completed Follow-ups On Time / Total Completed Follow-ups * 100',
      dueToday,
      scoreDistribution: { hot: hotLeads, warm: warmLeads, cold: coldLeads },
      sourceWise,
      stageDistribution,
      counsellorWorkloads,
    },
  });
});

// POST /api/leads/:id/convert (Lead-to-Student Conversion Workflow)
router.post('/leads/:id/convert', authenticate, requireRole('ADMIN', 'COUNSELLOR', 'ADMISSIONS_COUNSELLOR'), async (req: Request, res: Response) => {
  const { id } = req.params;
  const { courseId, feeStatus = 'PENDING' } = req.body;
  const prisma = getPrisma();

  let lead: any = null;
  if (prisma) {
    try {
      lead = await prisma.lead.findUnique({ where: { id } });
    } catch {}
  }
  if (!lead) {
    lead = store.getState().leads.find((l) => l.id === id);
  }
  if (!lead) {
    return res.status(404).json({ success: false, error: 'Lead not found' });
  }

  // Check duplicate conversion
  if (lead.convertedToStudentId) {
    return res.status(409).json({
      success: false,
      error: `Lead has already been converted to student with ID ${lead.convertedToStudentId}`,
    });
  }

  // Determine course
  let targetCourseId = courseId || null;
  if (prisma && !targetCourseId && lead.courseInterest) {
    try {
      const matchedCourse = await prisma.course.findFirst({
        where: {
          OR: [
            { title: { contains: lead.courseInterest, mode: 'insensitive' } },
            { courseCode: { contains: lead.courseInterest, mode: 'insensitive' } },
          ],
        },
      });
      if (matchedCourse) targetCourseId = matchedCourse.id;
    } catch {}
  }

  // Generate unique student ID number
  let nextStudentNum = 101;
  if (prisma) {
    try {
      const count = await prisma.student.count();
      nextStudentNum = count + 1;
    } catch {}
  } else {
    nextStudentNum = store.getState().students.length + 1;
  }
  const studentIdNumber = `STU${String(nextStudentNum).padStart(3, '0')}`;

  let student: any = null;
  if (prisma) {
    try {
      student = await prisma.student.create({
        data: {
          studentIdNumber,
          studentId: studentIdNumber,
          name: lead.studentName,
          fullName: lead.studentName,
          email: lead.email,
          phone: lead.phone,
          courseId: targetCourseId,
          admissionDate: new Date(),
          feeStatus: feeStatus as any,
          studentStatus: 'ACTIVE',
          enrollmentStatus: 'ACTIVE',
          convertedFromLeadId: lead.id,
          isDemoData: false,
        },
      });

      await prisma.lead.update({
        where: { id: lead.id },
        data: {
          stage: 'Enrolled',
          convertedToStudentId: student.id,
        },
      });
    } catch (dbErr: any) {
      logger.warn({ err: dbErr }, 'Failed to convert lead in PostgreSQL, using memory fallback');
    }
  }

  if (!student) {
    student = {
      id: `stu-${Date.now()}`,
      studentIdNumber,
      studentId: studentIdNumber,
      name: lead.studentName,
      fullName: lead.studentName,
      email: lead.email,
      phone: lead.phone,
      courseId: targetCourseId,
      admissionDate: new Date().toISOString(),
      feeStatus,
      studentStatus: 'ACTIVE',
      enrollmentStatus: 'ACTIVE',
      isDemoData: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    store.getState().students.unshift(student);
  }

  const memLead = store.getState().leads.find((l) => l.id === id);
  if (memLead) {
    memLead.stage = 'Enrolled';
    (memLead as any).convertedToStudentId = student.id;
  }

  store.logAudit({
    userId: req.user?.id,
    userEmail: req.user?.email,
    action: 'LEAD_CONVERTED_TO_STUDENT',
    entityType: 'Student',
    entityId: student.id,
    details: { leadId: lead.id, studentIdNumber, studentName: student.name },
  });

  return res.status(201).json({
    success: true,
    message: 'Lead converted to student record successfully',
    student,
    lead: { ...lead, stage: 'Enrolled', convertedToStudentId: student.id },
  });
});

export default router;

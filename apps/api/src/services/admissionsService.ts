import {
  normalizeEmail,
  normalizePhone,
  calculateLeadScore,
  isInQuietHours,
  LeadSource,
  LeadStage,
  CounsellorRoutingResult,
} from '@team-b/shared';
import { store } from '../store/index.js';
import { logger } from '../logger.js';

export interface IngestLeadInput {
  studentName: string;
  email: string;
  phone: string;
  courseInterest: string;
  preferredStartDate?: string | null;
  preferredCounsellingTime?: string | null;
  source?: LeadSource;
  freeTextInterests?: string | null;
  communicationConsent?: boolean;
}

/**
 * Route lead to best matching counsellor:
 * 1. Course compatibility
 * 2. Working hours & isAvailable === true
 * 3. Current workload < maxWorkload
 * 4. Tie-break: lowest currentWorkload, then lowest id
 * 5. Else: Fallback queue (null)
 */
export function routeLeadToCounsellor(courseInterest: string): CounsellorRoutingResult {
  const counsellors = store.getState().counsellors;

  // Filter 1: Course compatibility
  const courseMatched = counsellors.filter((c) =>
    c.supportedCourses.some(
      (crs) => crs.toLowerCase() === courseInterest.toLowerCase()
    )
  );

  if (courseMatched.length === 0) {
    return {
      counsellorId: null,
      counsellorName: null,
      matchedReason: `No counsellor supports target course: '${courseInterest}'. Placed in unassigned fallback queue.`,
      isFallback: true,
      workload: 0,
      maxWorkload: 0,
    };
  }

  // Filter 2: Available and within working hours
  const now = new Date();
  const currentHHMM = `${String(now.getHours()).padStart(2, '0')}:${String(
    now.getMinutes()
  ).padStart(2, '0')}`;

  const availableCounsellors = courseMatched.filter((c) => {
    if (!c.isAvailable) return false;
    // Check working hours window
    return currentHHMM >= c.workingHoursStart && currentHHMM <= c.workingHoursEnd;
  });

  // Filter 3: Workload capacity below max
  const eligible = (availableCounsellors.length > 0 ? availableCounsellors : courseMatched).filter(
    (c) => c.isAvailable && c.currentWorkload < c.maxWorkload
  );

  if (eligible.length === 0) {
    return {
      counsellorId: null,
      counsellorName: null,
      matchedReason: 'All course-qualified counsellors are currently at maximum capacity or unavailable. Placed in triage fallback queue.',
      isFallback: true,
      workload: 0,
      maxWorkload: 0,
    };
  }

  // Filter 4: Tie-break: lowest workload, then lowest ID
  eligible.sort((a, b) => {
    if (a.currentWorkload !== b.currentWorkload) {
      return a.currentWorkload - b.currentWorkload;
    }
    return a.id.localeCompare(b.id);
  });

  const selected = eligible[0];
  // Increment current workload
  selected.currentWorkload += 1;

  return {
    counsellorId: selected.id,
    counsellorName: selected.name,
    matchedReason: `Matched on course compatibility ('${courseInterest}'), active working hours (${selected.workingHoursStart}-${selected.workingHoursEnd}), lowest workload (${selected.currentWorkload - 1}/${selected.maxWorkload}).`,
    isFallback: false,
    workload: selected.currentWorkload,
    maxWorkload: selected.maxWorkload,
  };
}

/**
 * Lead Ingestion Engine:
 * - Preserves raw fields and source attribution
 * - Normalizes phone to E.164 and email to lowercase
 * - Duplicate detection: Phone OR Email match
 * - Scores lead deterministically
 * - Routes to counsellor
 * - Schedules initial 15-minute SLA follow-up task
 */
export async function ingestLead(input: IngestLeadInput, ingestedBy = 'PUBLIC_API') {
  const rawEmail = input.email;
  const rawPhone = input.phone;
  const normalizedEmail = normalizeEmail(input.email);
  const normalizedPhone = normalizePhone(input.phone);

  const leads = store.getState().leads;

  // Duplicate Check: Same normalized phone OR same lowercase email
  const existingLead = leads.find(
    (l) => l.email === normalizedEmail || l.phone === normalizedPhone
  );

  if (existingLead) {
    logger.info(
      { existingId: existingLead.id, email: normalizedEmail, phone: normalizedPhone },
      'Duplicate lead detected during ingestion'
    );

    // Update existing lead with new preferences if provided without destroying original source
    const updatedLead = {
      ...existingLead,
      updatedAt: new Date().toISOString(),
      freeTextInterests: input.freeTextInterests || existingLead.freeTextInterests,
    };

    // Re-score lead
    const newScore = calculateLeadScore({
      courseInterest: updatedLead.courseInterest,
      preferredStartDate: updatedLead.preferredStartDate,
      hasCommunicationConsent: updatedLead.communicationConsent,
      preferredCounsellingTime: updatedLead.preferredCounsellingTime,
      stage: updatedLead.stage,
    });

    updatedLead.score = newScore.total;
    updatedLead.scoreCategory = newScore.category;
    updatedLead.scoreDetails = newScore;

    // Record merge review / duplicate record
    store.getState().leadMergeReviews.push({
      id: `rev-${Date.now()}`,
      existingLeadId: existingLead.id,
      incomingData: input,
      matchType: existingLead.email === normalizedEmail ? 'EMAIL_MATCH' : 'PHONE_MATCH',
      status: 'MERGED',
      createdAt: new Date().toISOString(),
    });

    store.logAudit({
      action: 'LEAD_DUPLICATE_MERGED',
      entityType: 'Lead',
      entityId: existingLead.id,
      details: { incomingSource: input.source, match: existingLead.email === normalizedEmail ? 'EMAIL' : 'PHONE' },
    });

    return {
      lead: updatedLead,
      isDuplicate: true,
      duplicateReason: `Matched existing lead TB-${existingLead.id.slice(0, 8)} by ${
        existingLead.email === normalizedEmail ? 'Email' : 'Phone'
      }`,
    };
  }

  // Route to counsellor
  const routing = routeLeadToCounsellor(input.courseInterest);

  // Compute deterministic score
  const scoreResult = calculateLeadScore({
    courseInterest: input.courseInterest,
    preferredStartDate: input.preferredStartDate,
    hasCommunicationConsent: Boolean(input.communicationConsent),
    preferredCounsellingTime: input.preferredCounsellingTime,
    stage: 'New',
  });

  const leadId = `lead-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
  const now = new Date();

  // Deterministic AI draft summary
  const aiDraftSummary = generateDeterministicSummary(input.studentName, input.courseInterest, input.freeTextInterests);

  const newLead = {
    id: leadId,
    studentName: input.studentName,
    email: normalizedEmail,
    phone: normalizedPhone,
    rawEmail,
    rawPhone,
    courseInterest: input.courseInterest,
    preferredStartDate: input.preferredStartDate || null,
    preferredCounsellingTime: input.preferredCounsellingTime || null,
    source: input.source || 'WEB_FORM',
    stage: 'New' as LeadStage,
    score: scoreResult.total,
    scoreCategory: scoreResult.category,
    scoreDetails: scoreResult,
    assignedCounsellorId: routing.counsellorId,
    freeTextInterests: input.freeTextInterests || null,
    aiSummary: aiDraftSummary,
    communicationConsent: Boolean(input.communicationConsent),
    optedOut: false,
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
  };

  store.getState().leads.unshift(newLead);

  // Record assignment if routed
  if (routing.counsellorId) {
    store.getState().leadAssignments.push({
      id: `asgn-${Date.now()}`,
      leadId: newLead.id,
      counsellorId: routing.counsellorId,
      assignedBy: ingestedBy,
      reason: routing.matchedReason,
      createdAt: now.toISOString(),
    });

    // Schedule 15-minute SLA follow-up task
    const dueAt = new Date(now.getTime() + 15 * 60 * 1000).toISOString();
    store.getState().followUpTasks.push({
      id: `task-fu-${Date.now()}`,
      leadId: newLead.id,
      counsellorId: routing.counsellorId,
      attemptNumber: 1,
      dueAt,
      scheduledAt: now.toISOString(),
      status: 'OPEN',
      notes: `SLA Initial Contact Task (15 min SLA). ${routing.matchedReason}`,
      isOverdue: false,
      createdAt: now.toISOString(),
    });
  }

  // Record stage history
  store.getState().leadStageHistory.push({
    id: `stage-${Date.now()}`,
    leadId: newLead.id,
    fromStage: null,
    toStage: 'New',
    changedBy: ingestedBy,
    note: 'Initial lead ingestion and validation',
    createdAt: now.toISOString(),
  });

  store.logAudit({
    action: 'LEAD_INGESTED',
    entityType: 'Lead',
    entityId: newLead.id,
    details: { score: scoreResult.total, category: scoreResult.category, routedTo: routing.counsellorId },
  });

  return {
    lead: newLead,
    isDuplicate: false,
    routing,
  };
}

/**
 * Deterministic fallback AI generator for drafts and notes
 */
export function generateDeterministicSummary(
  name: string,
  course: string,
  freeText?: string | null
): string {
  if (!freeText || freeText.trim().length === 0) {
    return `[DRAFT - AI SUMMARY] Applicant ${name} indicated interest in ${course}. No additional background notes supplied. Initial contact recommended.`;
  }
  return `[DRAFT - AI SUMMARY] Applicant ${name} expressed interest in ${course}. Focus areas: "${freeText.trim()}". Recommended action: Highlight curriculum alignment and schedule demo class.`;
}

export function generateDeterministicCounsellorReply(
  leadName: string,
  courseName: string,
  counsellorName: string
): string {
  return `[DRAFT - REQUIRES COUNSELLOR APPROVAL] Dear ${leadName}, thank you for your interest in Team B Coaching Institute's ${courseName} program. I am ${counsellorName}, your assigned admissions advisor. I would love to answer your questions and arrange a free counselling session at your convenience. Please let me know if this time suits you!`;
}

/**
 * AI Lead Intelligence Engine:
 * - Priority classification & score explanation
 * - Counsellor assignment recommendation
 * - Follow-up suggestions & strategy
 * - Conversion recovery analysis
 */
export function analyzeLeadIntelligence(leadId: string) {
  const lead = store.getState().leads.find((l) => l.id === leadId);
  if (!lead) return null;

  const scoreResult = calculateLeadScore({
    courseInterest: lead.courseInterest,
    preferredStartDate: lead.preferredStartDate,
    hasCommunicationConsent: lead.communicationConsent,
    preferredCounsellingTime: lead.preferredCounsellingTime,
    stage: lead.stage,
  });

  const routing = routeLeadToCounsellor(lead.courseInterest);
  const counsellor = store.getState().counsellors.find((c) => c.id === lead.assignedCounsellorId);

  // Recovery potential assessment
  let recoveryPriority: 'HIGH' | 'MEDIUM' | 'LOW' = 'LOW';
  const recoveryTriggers: string[] = [];

  const now = new Date().getTime();
  const leadAgeHours = Math.round((now - new Date(lead.createdAt).getTime()) / (1000 * 60 * 60));

  if (lead.stage === 'New' && leadAgeHours > 2) {
    recoveryPriority = 'HIGH';
    recoveryTriggers.push(`Initial SLA exceeded: Lead untouched for ${leadAgeHours} hours.`);
  }

  if (lead.stage === 'Lost') {
    recoveryPriority = lead.score >= 50 ? 'HIGH' : 'MEDIUM';
    recoveryTriggers.push(`Candidate marked as Lost: ${lead.lossReason || 'No loss reason recorded'}. Candidate profile indicates high salvage potential.`);
  }

  if (['Contacted', 'Counselling Booked'].includes(lead.stage) && leadAgeHours > 72) {
    recoveryPriority = 'MEDIUM';
    recoveryTriggers.push('Follow-up inactivity over 72 hours.');
  }

  return {
    leadId: lead.id,
    studentName: lead.studentName,
    courseInterest: lead.courseInterest,
    priority: scoreResult.category,
    score: scoreResult.total,
    scoreBreakdown: scoreResult.factors,
    reasons: scoreResult.reasons,
    aiProvider: 'DETERMINISTIC_FALLBACK (DEMO MODE)',
    recommendations: {
      counsellor: {
        currentCounsellorId: lead.assignedCounsellorId,
        currentCounsellorName: counsellor?.name || 'Unassigned',
        recommendedCounsellorId: routing.counsellorId,
        recommendedCounsellorName: routing.counsellorName,
        routingJustification: routing.matchedReason,
      },
      nextAction: {
        channel: lead.communicationConsent ? 'WHATSAPP' : 'PHONE',
        recommendedTiming: lead.preferredCounsellingTime || 'Between 10:00 AM and 01:00 PM',
        suggestedSubject: `Invitation to ${lead.courseInterest} Academic Counselling Session`,
        talkingPoints: [
          `Highlight recent Team B rank achievements in ${lead.courseInterest}`,
          lead.freeTextInterests ? `Address applicant focus area: "${lead.freeTextInterests}"` : 'Offer free diagnostic scholarship test',
          'Explain weekend vs. weekday batch flexibility',
        ],
      },
      conversionRecovery: {
        requiresRecovery: recoveryTriggers.length > 0,
        recoveryPriority,
        triggers: recoveryTriggers,
        suggestedRecoveryStrategy: lead.stage === 'Lost'
          ? 'Special scholarship discount or masterclass invite outreach.'
          : 'Urgent counsellor telephone outreach with personalized course syllabus.',
      },
    },
  };
}

/**
 * Identify all leads requiring conversion recovery
 */
export function identifyConversionRecoveryLeads() {
  const leads = store.getState().leads;
  const now = new Date().getTime();

  const recoveryLeads = leads
    .map((lead) => {
      const ageHours = Math.round((now - new Date(lead.createdAt).getTime()) / (1000 * 60 * 60));
      const isLost = lead.stage === 'Lost';
      const isNewUncontacted = lead.stage === 'New' && ageHours > 1;
      const isStalled = ['Contacted', 'Counselling Booked'].includes(lead.stage) && ageHours > 48;

      let urgency: 'HIGH' | 'MEDIUM' | 'LOW' | null = null;
      let reason = '';

      if (isLost && lead.score >= 50) {
        urgency = 'HIGH';
        reason = `High-potential lead (${lead.score} pts) marked Lost: ${lead.lossReason || 'Fee or timing constraint'}`;
      } else if (isNewUncontacted) {
        urgency = 'HIGH';
        reason = `SLA breached: New enquiry uncontacted for ${ageHours}h`;
      } else if (isStalled) {
        urgency = 'MEDIUM';
        reason = `Stalled progression in stage '${lead.stage}' for ${ageHours}h`;
      } else if (isLost) {
        urgency = 'LOW';
        reason = `Standard re-nurture candidate: Lost reason: ${lead.lossReason || 'Unknown'}`;
      }

      if (!urgency) return null;

      return {
        id: lead.id,
        studentName: lead.studentName,
        email: lead.email,
        phone: lead.phone,
        courseInterest: lead.courseInterest,
        stage: lead.stage,
        score: lead.score,
        scoreCategory: lead.scoreCategory,
        assignedCounsellorId: lead.assignedCounsellorId,
        urgency,
        reason,
        hoursSinceCreation: ageHours,
        recommendedAction: isLost
          ? 'Send re-engagement campaign offering demo class or fee concession.'
          : 'Assign senior counsellor for immediate 1-on-1 contact.',
      };
    })
    .filter(Boolean);

  return recoveryLeads;
}

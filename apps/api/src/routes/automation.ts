import { Router, Request, Response } from 'express';
import { store } from '../store/index.js';
import { config } from '../config.js';
import { ingestLead } from '../services/admissionsService.js';
import { processAttendanceImport } from '../services/academicService.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

// Middleware: Verify Shared Webhook Secret from n8n
function verifyN8nSecret(req: Request, res: Response, next: any) {
  const secret = req.headers['x-n8n-secret'] || req.headers['x-shared-secret'];
  if (config.env !== 'test' && secret !== config.n8nSharedWebhookSecret) {
    return res.status(401).json({
      success: false,
      error: 'Unauthorized webhook call. Shared secret mismatch.',
    });
  }
  next();
}

// POST /api/webhooks/n8n/lead
router.post('/webhooks/n8n/lead', verifyN8nSecret, async (req: Request, res: Response) => {
  const leadData = req.body;
  if (!leadData.studentName || !leadData.email || !leadData.phone || !leadData.courseInterest) {
    return res.status(400).json({
      success: false,
      error: 'Missing required lead fields (studentName, email, phone, courseInterest)',
    });
  }

  const result = await ingestLead(leadData, 'N8N_WORKFLOW_01');

  // Record automation run
  const runRecord = {
    id: `run-${Date.now()}`,
    workflowName: '01 Lead Form Ingestion',
    status: 'SUCCESS',
    details: { leadId: result.lead.id, isDuplicate: result.isDuplicate },
    timestamp: new Date().toISOString(),
  };
  store.getState().automationRuns.unshift(runRecord);

  return res.status(201).json({
    success: true,
    runId: runRecord.id,
    lead: result.lead,
    isDuplicate: result.isDuplicate,
  });
});

// POST /api/webhooks/n8n/attendance
router.post('/webhooks/n8n/attendance', verifyN8nSecret, async (req: Request, res: Response) => {
  const { rows, fileName = 'n8n_attendance.csv' } = req.body;
  if (!Array.isArray(rows) || rows.length === 0) {
    return res.status(400).json({
      success: false,
      error: "Missing or invalid 'rows' array",
    });
  }

  const result = processAttendanceImport(rows, fileName, true);

  const runRecord = {
    id: `run-${Date.now()}`,
    workflowName: '10 Attendance CSV Import',
    status: result.rejectedRows === 0 ? 'SUCCESS' : 'PARTIAL_SUCCESS',
    details: { valid: result.validRows, rejected: result.rejectedRows, batchId: result.importBatchId },
    timestamp: new Date().toISOString(),
  };
  store.getState().automationRuns.unshift(runRecord);

  return res.json({
    success: true,
    runId: runRecord.id,
    result,
  });
});

// POST /api/webhooks/n8n/counsellor-assignment
router.post('/webhooks/n8n/counsellor-assignment', verifyN8nSecret, (req: Request, res: Response) => {
  const { leadId, counsellorId, reason, executionId } = req.body;
  if (!leadId || !counsellorId) {
    return res.status(400).json({
      success: false,
      error: 'Missing required fields (leadId, counsellorId)',
    });
  }

  const lead = store.getState().leads.find((l) => l.id === leadId);
  if (!lead) {
    return res.status(404).json({ success: false, error: 'Lead not found' });
  }

  const counsellor = store.getState().counsellors.find((c) => c.id === counsellorId);
  if (!counsellor) {
    return res.status(404).json({ success: false, error: 'Counsellor not found' });
  }

  lead.assignedCounsellorId = counsellor.id;
  lead.updatedAt = new Date().toISOString();

  const asgnRecord = {
    id: `asgn-n8n-${Date.now()}`,
    leadId: lead.id,
    counsellorId: counsellor.id,
    assignedBy: 'N8N_WORKFLOW_04',
    reason: reason || 'Automated assignment notification from n8n',
    createdAt: new Date().toISOString(),
  };
  store.getState().leadAssignments.push(asgnRecord);

  const runRecord = {
    id: executionId || `run-${Date.now()}`,
    workflowName: '04 Counsellor Routing & Notification',
    status: 'SUCCESS',
    details: { leadId, counsellorId, counsellorName: counsellor.name },
    timestamp: new Date().toISOString(),
  };
  store.getState().automationRuns.unshift(runRecord);

  return res.json({ success: true, runId: runRecord.id, assignment: asgnRecord });
});

// POST /api/webhooks/n8n/at-risk-alert
router.post('/webhooks/n8n/at-risk-alert', verifyN8nSecret, (req: Request, res: Response) => {
  const { studentId, rule, severity, evidence, suggestedAction, executionId } = req.body;
  if (!studentId || !evidence) {
    return res.status(400).json({
      success: false,
      error: 'Missing required alert fields (studentId, evidence)',
    });
  }

  const student = store.getState().students.find((s) => s.id === studentId);
  if (!student) {
    return res.status(404).json({ success: false, error: 'Student not found' });
  }

  const flag = {
    id: `flag-n8n-${Date.now()}`,
    studentId: student.id,
    rule: rule || 'ENGAGEMENT_ANOMALY',
    severity: severity || 'HIGH',
    evidence,
    observationWindowStart: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    observationWindowEnd: new Date().toISOString(),
    suggestedAction: suggestedAction || 'Review student engagement immediately',
    status: 'ACTIVE',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  store.getState().engagementFlags.unshift(flag);

  const runRecord = {
    id: executionId || `run-${Date.now()}`,
    workflowName: '12 At-Risk Alert Notification',
    status: 'SUCCESS',
    details: { flagId: flag.id, studentId: student.id },
    timestamp: new Date().toISOString(),
  };
  store.getState().automationRuns.unshift(runRecord);

  return res.status(201).json({ success: true, runId: runRecord.id, flag });
});

// POST /api/webhooks/n8n/coordinator-task
router.post('/webhooks/n8n/coordinator-task', verifyN8nSecret, (req: Request, res: Response) => {
  const { studentId, severity = 'MEDIUM', evidence, recommendedAction, dueDate, executionId } = req.body;
  if (!studentId || !evidence || !recommendedAction) {
    return res.status(400).json({
      success: false,
      error: 'Missing required coordinator task fields (studentId, evidence, recommendedAction)',
    });
  }

  const student = store.getState().students.find((s) => s.id === studentId);
  if (!student) {
    return res.status(404).json({ success: false, error: 'Student not found' });
  }

  const coordinator = store.getState().users.find((u) => u.role === 'ACADEMIC_COORDINATOR') || store.getState().users[0];

  const task = {
    id: `task-n8n-${Date.now()}`,
    studentId: student.id,
    studentName: student.name,
    flagId: null,
    coordinatorId: coordinator.id,
    coordinatorName: coordinator.name,
    severity,
    evidence,
    recommendedAction,
    dueDate: dueDate || new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(),
    status: 'OPEN',
    notes: 'Triggered via n8n automation workflow 13',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  store.getState().interventionTasks.unshift(task);

  const runRecord = {
    id: executionId || `run-${Date.now()}`,
    workflowName: '13 Coordinator Task Creation',
    status: 'SUCCESS',
    details: { taskId: task.id, studentId: student.id },
    timestamp: new Date().toISOString(),
  };
  store.getState().automationRuns.unshift(runRecord);

  return res.status(201).json({ success: true, runId: runRecord.id, task });
});

// POST /api/webhooks/n8n/weekly-summary
router.post('/webhooks/n8n/weekly-summary', verifyN8nSecret, (req: Request, res: Response) => {
  const { studentId, executionId } = req.body;
  if (!studentId) {
    return res.status(400).json({ success: false, error: 'studentId is required' });
  }

  const student = store.getState().students.find((s) => s.id === studentId);
  if (!student) {
    return res.status(404).json({ success: false, error: 'Student not found' });
  }

  const attRecords = store.getState().attendanceRecords.filter((r) => r.studentId === student.id);
  const now = new Date();
  const summary = {
    id: `sum-n8n-${Date.now()}`,
    studentId: student.id,
    studentName: student.name,
    isoWeek: `${now.getFullYear()}-W${Math.ceil(now.getDate() / 7)}`,
    attendancePercentage: 85,
    classesAttended: attRecords.filter((r) => r.status === 'PRESENT').length,
    classesMissed: attRecords.filter((r) => r.status === 'ABSENT').length,
    classesExcused: 0,
    assignmentCompletionRate: 90,
    assessmentTrend: 'CONSISTENT_STRONG',
    generatedAt: now.toISOString(),
  };
  store.getState().weeklySummaries.unshift(summary);

  const runRecord = {
    id: executionId || `run-${Date.now()}`,
    workflowName: '14 Weekly Summary Generation',
    status: 'SUCCESS',
    details: { summaryId: summary.id, studentId: student.id },
    timestamp: now.toISOString(),
  };
  store.getState().automationRuns.unshift(runRecord);

  return res.status(201).json({ success: true, runId: runRecord.id, summary });
});

// POST /api/webhooks/n8n/parent-communication
router.post('/webhooks/n8n/parent-communication', verifyN8nSecret, (req: Request, res: Response) => {
  const { messageId, approved, executionId } = req.body;
  if (!messageId) {
    return res.status(400).json({ success: false, error: 'messageId is required' });
  }

  const message = store.getState().messageApprovals.find((m) => m.id === messageId);
  if (!message) {
    return res.status(404).json({ success: false, error: 'Message not found' });
  }

  if (approved) {
    message.status = 'APPROVED';
    message.deliveryStatus = 'SIMULATED';
    message.deliveryAttemptCount += 1;
    message.isSimulated = true;
    message.updatedAt = new Date().toISOString();
  } else {
    message.status = 'REJECTED';
    message.updatedAt = new Date().toISOString();
  }

  const runRecord = {
    id: executionId || `run-${Date.now()}`,
    workflowName: '15 Parent Message Approval & Dispatch',
    status: 'SUCCESS',
    details: { messageId, approved, status: message.status },
    timestamp: new Date().toISOString(),
  };
  store.getState().automationRuns.unshift(runRecord);

  return res.json({ success: true, runId: runRecord.id, message });
});

// POST /api/webhooks/n8n/workflow-error (Workflow error reporting)
router.post('/webhooks/n8n/workflow-error', verifyN8nSecret, (req: Request, res: Response) => {
  const { workflowName, errorMessage, errorDetails, executionId } = req.body;

  const errorRun = {
    id: executionId || `run-err-${Date.now()}`,
    workflowName: workflowName || 'Unknown Workflow',
    status: 'FAILED',
    details: {
      error: errorMessage || 'An unexpected workflow execution error occurred in n8n',
      diagnostics: errorDetails || {},
    },
    timestamp: new Date().toISOString(),
  };
  store.getState().automationRuns.unshift(errorRun);

  store.logAudit({
    action: 'N8N_WORKFLOW_ERROR',
    entityType: 'AutomationRun',
    entityId: errorRun.id,
    details: { workflowName, error: errorMessage },
  });

  return res.status(201).json({
    success: true,
    runId: errorRun.id,
    message: 'Workflow error recorded and audit logged',
  });
});

// POST /api/webhooks/n8n (General root webhook)
router.post('/webhooks/n8n', verifyN8nSecret, (req: Request, res: Response) => {
  const payload = req.body;
  const runRecord = {
    id: payload.executionId || `run-${Date.now()}`,
    workflowName: payload.workflowName || 'n8n Inbound Webhook',
    status: payload.status || 'SUCCESS',
    details: payload.data || payload,
    timestamp: new Date().toISOString(),
  };
  store.getState().automationRuns.unshift(runRecord);

  return res.json({
    success: true,
    runId: runRecord.id,
    received: true,
  });
});

// GET /api/automation/runs
router.get('/automation/runs', authenticate, (req: Request, res: Response) => {
  const runs = store.getState().automationRuns;
  return res.json({ success: true, runs, total: runs.length });
});

// POST /api/automation/runs (manual or webhook logging)
router.post('/automation/runs', verifyN8nSecret, (req: Request, res: Response) => {
  const { workflowName, status, details, executionId } = req.body;
  const runRecord = {
    id: executionId || `run-${Date.now()}`,
    workflowName: workflowName || 'Unknown Workflow',
    status: status || 'SUCCESS',
    details: details || {},
    timestamp: new Date().toISOString(),
  };
  store.getState().automationRuns.unshift(runRecord);
  return res.json({ success: true, run: runRecord });
});

export default router;

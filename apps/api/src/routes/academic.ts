import { Router, Request, Response } from 'express';
import {
  resolveEngagementFlagSchema,
  dismissEngagementFlagSchema,
  updateInterventionTaskSchema,
  approveMessageSchema,
  computeAttendanceMetrics,
  calculateAttendancePercentage,
  attendanceRecordCreateSchema,
  createMessageSchema,
  parentPreferenceSchema,
} from '@team-b/shared';
import { store } from '../store/index.js';
import {
  processAttendanceImport,
  evaluateStudentAtRiskRules,
  generateWeeklySummary,
} from '../services/academicService.js';
import { authenticate, requireRole } from '../middleware/auth.js';

const router = Router();

// GET /api/students
router.get('/students', authenticate, (req: Request, res: Response) => {
  const { classId, search } = req.query;
  let students = store.getState().students;

  if (search) {
    const q = (search as string).toLowerCase();
    students = students.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        s.email.toLowerCase().includes(q) ||
        s.studentIdNumber.toLowerCase().includes(q)
    );
  }

  const enriched = students.map((s) => {
    const guardian = store.getState().guardians.find((g) => g.studentId === s.id);
    const enrolment = store.getState().enrolments.find((e) => e.studentId === s.id);
    const targetClass = enrolment
      ? store.getState().classes.find((c) => c.id === enrolment.classId)
      : null;
    const attRecords = store.getState().attendanceRecords.filter((r) => r.studentId === s.id);
    const metrics = computeAttendanceMetrics(s.id, attRecords, 30);
    const activeFlags = store
      .getState()
      .engagementFlags.filter((f) => f.studentId === s.id && f.status === 'ACTIVE');

    return {
      ...s,
      guardian: guardian || null,
      class: targetClass || null,
      attendancePercentage: metrics.attendancePercentage,
      activeFlagsCount: activeFlags.length,
    };
  });

  return res.json({ success: true, students: enriched, total: enriched.length });
});

// GET /api/students/:id
router.get('/students/:id', authenticate, (req: Request, res: Response) => {
  const student = store.getState().students.find((s) => s.id === req.params.id);
  if (!student) {
    return res.status(404).json({ success: false, error: 'Student not found' });
  }

  const guardian = store.getState().guardians.find((g) => g.studentId === student.id);
  const pref = guardian
    ? store.getState().guardianPreferences.find((p) => p.guardianId === guardian.id)
    : null;
  const enrolment = store.getState().enrolments.find((e) => e.studentId === student.id);
  const targetClass = enrolment
    ? store.getState().classes.find((c) => c.id === enrolment.classId)
    : null;

  const attendanceRecords = store
    .getState()
    .attendanceRecords.filter((r) => r.studentId === student.id)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const assessmentRecords = store
    .getState()
    .assessmentRecords.filter((r) => r.studentId === student.id)
    .sort((a, b) => new Date(b.assessmentDate).getTime() - new Date(a.assessmentDate).getTime());

  const engagementFlags = store
    .getState()
    .engagementFlags.filter((f) => f.studentId === student.id);

  const tasks = store
    .getState()
    .interventionTasks.filter((t) => t.studentId === student.id);

  const metrics = computeAttendanceMetrics(student.id, attendanceRecords, 30);

  return res.json({
    success: true,
    student: {
      ...student,
      guardian: guardian ? { ...guardian, preference: pref } : null,
      class: targetClass,
      metrics,
      attendanceRecords,
      assessmentRecords,
      engagementFlags,
      tasks,
    },
  });
});

// POST /api/imports/attendance
router.post(
  '/imports/attendance',
  authenticate,
  requireRole('ADMIN', 'ACADEMIC_COORDINATOR', 'TEACHER'),
  (req: Request, res: Response) => {
    const { rows, fileName, commit = true } = req.body;

    if (!Array.isArray(rows)) {
      return res.status(400).json({
        success: false,
        error: "Invalid input. Expected 'rows' array of attendance records.",
      });
    }

    const result = processAttendanceImport(rows, fileName, commit);

    store.logAudit({
      userId: req.user?.id,
      userEmail: req.user?.email,
      action: commit ? 'ATTENDANCE_IMPORTED' : 'ATTENDANCE_PREVIEW',
      entityType: 'ImportBatch',
      entityId: result.importBatchId,
      details: { validRows: result.validRows, rejectedRows: result.rejectedRows, commit },
    });

    return res.json({
      success: true,
      result,
    });
  }
);

// GET /api/imports
router.get('/imports', authenticate, (req: Request, res: Response) => {
  const batches = store.getState().importBatches;
  return res.json({ success: true, batches });
});

// GET /api/imports/:id
router.get('/imports/:id', authenticate, (req: Request, res: Response) => {
  const batch = store.getState().importBatches.find((b) => b.id === req.params.id);
  if (!batch) {
    return res.status(404).json({ success: false, error: 'Import batch not found' });
  }

  const errors = store.getState().importErrors.filter((e) => e.batchId === batch.id);
  return res.json({ success: true, batch: { ...batch, errors } });
});

// GET /api/attendance
router.get('/attendance', authenticate, (req: Request, res: Response) => {
  const { studentId, classId, status, date, limit = '100' } = req.query;
  let records = store.getState().attendanceRecords;

  if (studentId) {
    records = records.filter((r) => r.studentId === studentId);
  }
  if (classId) {
    records = records.filter((r) => r.classId === classId);
  }
  if (status) {
    records = records.filter((r) => r.status === status);
  }
  if (date) {
    records = records.filter((r) => r.date.startsWith(date as string));
  }

  // Sort by date desc
  records = [...records].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const parsedLimit = Math.min(500, Math.max(1, parseInt(limit as string, 10)));
  const enriched = records.slice(0, parsedLimit).map((r) => {
    const student = store.getState().students.find((s) => s.id === r.studentId);
    const cls = store.getState().classes.find((c) => c.id === r.classId);
    return {
      ...r,
      studentName: student ? student.name : 'Unknown Student',
      studentIdNumber: student ? student.studentIdNumber : '',
      className: cls ? cls.name : 'Unknown Class',
    };
  });

  return res.json({
    success: true,
    total: records.length,
    records: enriched,
  });
});

// POST /api/attendance (Single record creation or bulk)
router.post(
  '/attendance',
  authenticate,
  requireRole('ADMIN', 'ACADEMIC_COORDINATOR', 'TEACHER'),
  (req: Request, res: Response) => {
    const parsed = attendanceRecordCreateSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        error: 'Invalid attendance record data',
        details: parsed.error.issues,
      });
    }

    const { studentId, classId, date, status, remarks } = parsed.data;

    const student = store.getState().students.find((s) => s.id === studentId);
    if (!student) {
      return res.status(404).json({ success: false, error: 'Student not found' });
    }

    const targetClass = store.getState().classes.find((c) => c.id === classId);
    if (!targetClass) {
      return res.status(404).json({ success: false, error: 'Class not found' });
    }

    // Duplicate check
    const datePrefix = date.slice(0, 10);
    const exists = store
      .getState()
      .attendanceRecords.some(
        (r) => r.studentId === studentId && r.classId === classId && r.date.startsWith(datePrefix)
      );

    if (exists) {
      return res.status(409).json({
        success: false,
        error: `Attendance already recorded for student ${student.name} on ${datePrefix}`,
      });
    }

    const record = {
      id: `att-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
      studentId,
      classId,
      date: date.includes('T') ? date : `${date}T09:00:00.000Z`,
      status,
      remarks: remarks || null,
      createdAt: new Date().toISOString(),
    };

    store.getState().attendanceRecords.push(record);

    // Evaluate at-risk rules for student
    evaluateStudentAtRiskRules(studentId);

    store.logAudit({
      userId: req.user?.id,
      userEmail: req.user?.email,
      action: 'ATTENDANCE_RECORDED',
      entityType: 'AttendanceRecord',
      entityId: record.id,
      details: { studentId, status, date },
    });

    return res.status(201).json({ success: true, record });
  }
);

// POST /api/attendance/import (Alias for CSV import)
router.post(
  '/attendance/import',
  authenticate,
  requireRole('ADMIN', 'ACADEMIC_COORDINATOR', 'TEACHER'),
  (req: Request, res: Response) => {
    const { rows, fileName, commit = true } = req.body;
    if (!Array.isArray(rows)) {
      return res.status(400).json({
        success: false,
        error: "Invalid input. Expected 'rows' array of attendance records.",
      });
    }

    const result = processAttendanceImport(rows, fileName, commit);
    return res.json({ success: true, result });
  }
);

// GET /api/attendance/stats
router.get('/attendance/stats', authenticate, (req: Request, res: Response) => {
  const attRecords = store.getState().attendanceRecords;
  let present = 0;
  let excused = 0;
  let absent = 0;
  let late = 0;

  attRecords.forEach((r) => {
    if (r.status === 'PRESENT') present++;
    else if (r.status === 'EXCUSED') excused++;
    else if (r.status === 'ABSENT') absent++;
    else if (r.status === 'LATE') late++;
  });

  const total = attRecords.length;
  const percentage =
    total - excused > 0 ? Math.round(((present + late + excused) / (total - excused)) * 1000) / 10 : 100;

  return res.json({
    success: true,
    stats: {
      totalRecords: total,
      present,
      excused,
      absent,
      late,
      overallAttendancePercentage: Math.min(100, percentage),
    },
  });
});

// GET /api/engagement/flags
router.get('/engagement/flags', authenticate, (req: Request, res: Response) => {
  const { status, studentId, rule, severity } = req.query;
  let flags = store.getState().engagementFlags;

  if (status) {
    flags = flags.filter((f) => f.status === status);
  }
  if (studentId) {
    flags = flags.filter((f) => f.studentId === studentId);
  }
  if (rule) {
    flags = flags.filter((f) => f.rule === rule);
  }
  if (severity) {
    flags = flags.filter((f) => f.severity === severity);
  }

  const enriched = flags.map((f) => {
    const student = store.getState().students.find((s) => s.id === f.studentId);
    return {
      ...f,
      studentName: student ? student.name : 'Unknown Student',
      studentIdNumber: student ? student.studentIdNumber : '',
    };
  });

  return res.json({ success: true, flags: enriched, total: enriched.length });
});

// POST /api/engagement/flags/:id/resolve
router.post(
  '/engagement/flags/:id/resolve',
  authenticate,
  requireRole('ADMIN', 'ACADEMIC_COORDINATOR'),
  (req: Request, res: Response) => {
    const parsed = resolveEngagementFlagSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        error: 'Resolution notes are required',
        details: parsed.error.issues,
      });
    }

    const flag = store.getState().engagementFlags.find((f) => f.id === req.params.id);
    if (!flag) {
      return res.status(404).json({ success: false, error: 'Flag not found' });
    }

    flag.status = 'RESOLVED';
    flag.resolutionNotes = parsed.data.resolutionNotes;
    flag.updatedAt = new Date().toISOString();

    // Also resolve associated coordinator task if any
    const associatedTask = store
      .getState()
      .interventionTasks.find((t) => t.flagId === flag.id && t.status === 'OPEN');
    if (associatedTask) {
      associatedTask.status = 'RESOLVED';
      associatedTask.resolutionReason = parsed.data.resolutionNotes;
      associatedTask.updatedAt = new Date().toISOString();
    }

    store.logAudit({
      userId: req.user?.id,
      userEmail: req.user?.email,
      action: 'ENGAGEMENT_FLAG_RESOLVED',
      entityType: 'EngagementFlag',
      entityId: flag.id,
      details: { resolutionNotes: parsed.data.resolutionNotes },
    });

    return res.json({ success: true, flag });
  }
);

// POST /api/engagement/flags/:id/dismiss
router.post(
  '/engagement/flags/:id/dismiss',
  authenticate,
  requireRole('ADMIN', 'ACADEMIC_COORDINATOR'),
  (req: Request, res: Response) => {
    const parsed = dismissEngagementFlagSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        error: 'Dismissal reason is required',
        details: parsed.error.issues,
      });
    }

    const flag = store.getState().engagementFlags.find((f) => f.id === req.params.id);
    if (!flag) {
      return res.status(404).json({ success: false, error: 'Flag not found' });
    }

    flag.status = 'DISMISSED';
    flag.dismissalReason = parsed.data.dismissalReason;
    flag.updatedAt = new Date().toISOString();

    const associatedTask = store
      .getState()
      .interventionTasks.find((t) => t.flagId === flag.id && t.status === 'OPEN');
    if (associatedTask) {
      associatedTask.status = 'DISMISSED';
      associatedTask.resolutionReason = `Flag dismissed: ${parsed.data.dismissalReason}`;
      associatedTask.updatedAt = new Date().toISOString();
    }

    store.logAudit({
      userId: req.user?.id,
      userEmail: req.user?.email,
      action: 'ENGAGEMENT_FLAG_DISMISSED',
      entityType: 'EngagementFlag',
      entityId: flag.id,
      details: { dismissalReason: parsed.data.dismissalReason },
    });

    return res.json({ success: true, flag });
  }
);

// GET /api/intervention-tasks
router.get('/intervention-tasks', authenticate, (req: Request, res: Response) => {
  const { status, coordinatorId, studentId } = req.query;
  let tasks = store.getState().interventionTasks;

  if (status) {
    tasks = tasks.filter((t) => t.status === status);
  }
  if (coordinatorId) {
    tasks = tasks.filter((t) => t.coordinatorId === coordinatorId);
  }
  if (studentId) {
    tasks = tasks.filter((t) => t.studentId === studentId);
  }

  const now = new Date();
  const enriched = tasks.map((t) => ({
    ...t,
    isOverdue: t.status === 'OPEN' && new Date(t.dueDate).getTime() < now.getTime(),
  }));

  return res.json({ success: true, tasks: enriched, total: enriched.length });
});

// PATCH /api/intervention-tasks/:id
router.patch(
  '/intervention-tasks/:id',
  authenticate,
  requireRole('ADMIN', 'ACADEMIC_COORDINATOR'),
  (req: Request, res: Response) => {
    const parsed = updateInterventionTaskSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        error: 'Invalid task update data',
        details: parsed.error.issues,
      });
    }

    const task = store.getState().interventionTasks.find((t) => t.id === req.params.id);
    if (!task) {
      return res.status(404).json({ success: false, error: 'Intervention task not found' });
    }

    Object.assign(task, parsed.data);
    task.updatedAt = new Date().toISOString();

    return res.json({ success: true, task });
  }
);

// GET /api/summaries/weekly
router.get('/summaries/weekly', authenticate, (req: Request, res: Response) => {
  const { studentId, isoWeek } = req.query;
  let summaries = store.getState().weeklySummaries;

  if (studentId) {
    summaries = summaries.filter((s) => s.studentId === studentId);
  }
  if (isoWeek) {
    summaries = summaries.filter((s) => s.isoWeek === isoWeek);
  }

  return res.json({ success: true, summaries, total: summaries.length });
});

// POST /api/summaries/weekly/generate
router.post(
  '/summaries/weekly/generate',
  authenticate,
  requireRole('ADMIN', 'ACADEMIC_COORDINATOR'),
  (req: Request, res: Response) => {
    const { studentId } = req.body;
    if (!studentId) {
      return res.status(400).json({ success: false, error: 'studentId is required' });
    }

    try {
      const result = generateWeeklySummary(studentId);
      return res.status(result.isNew ? 201 : 200).json({
        success: true,
        summary: result.summary,
        isNew: result.isNew,
      });
    } catch (e: any) {
      return res.status(400).json({ success: false, error: e.message });
    }
  }
);

// GET /api/messages (Parent communication queue)
router.get('/messages', authenticate, (req: Request, res: Response) => {
  const { status, studentId } = req.query;
  let messages = store.getState().messageApprovals;

  if (status) {
    messages = messages.filter((m) => m.status === status);
  }
  if (studentId) {
    messages = messages.filter((m) => m.studentId === studentId);
  }

  return res.json({ success: true, messages, total: messages.length });
});

// POST /api/messages/:id/approve
router.post(
  '/messages/:id/approve',
  authenticate,
  requireRole('ADMIN', 'ACADEMIC_COORDINATOR'),
  (req: Request, res: Response) => {
    const parsed = approveMessageSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        error: 'Invalid approval request',
        details: parsed.error.issues,
      });
    }

    const message = store.getState().messageApprovals.find((m) => m.id === req.params.id);
    if (!message) {
      return res.status(404).json({ success: false, error: 'Message draft not found' });
    }

    // Step 1: Check guardian preferences & consent
    const pref = store
      .getState()
      .guardianPreferences.find((p) => p.guardianId === message.guardianId);

    if (pref && !pref.consentGiven) {
      return res.status(400).json({
        success: false,
        error: 'Cannot approve or dispatch message: Guardian has revoked communication consent.',
      });
    }

    const { approved, editedContent, rejectionReason } = parsed.data;

    if (approved) {
      message.status = 'APPROVED';
      message.approverId = req.user?.id || 'STAFF';
      message.approverName = req.user?.name || 'Staff Approver';
      message.approvedAt = new Date().toISOString();
      if (editedContent) message.draftContent = editedContent;

      // Mock delivery simulation (flow: section 5)
      message.deliveryStatus = 'SIMULATED';
      message.deliveryAttemptCount += 1;
      message.isSimulated = true;
      message.updatedAt = new Date().toISOString();

      store.logAudit({
        userId: req.user?.id,
        userEmail: req.user?.email,
        action: 'PARENT_MESSAGE_APPROVED_SIMULATED',
        entityType: 'MessageApproval',
        entityId: message.id,
        details: { guardianContact: message.guardianContact, channel: message.channel },
      });
    } else {
      message.status = 'REJECTED';
      message.deliveryError = rejectionReason || 'Rejected by coordinator review';
      message.updatedAt = new Date().toISOString();
    }

    return res.json({
      success: true,
      message,
      isSimulated: true,
      simulatedNotice: 'SIMULATED: Message processed via safe mock channel.',
    });
  }
);

// GET /api/academic/analytics
router.get('/academic/analytics', authenticate, (req: Request, res: Response) => {
  const students = store.getState().students;
  const attRecords = store.getState().attendanceRecords;
  const flags = store.getState().engagementFlags;
  const tasks = store.getState().interventionTasks;
  const messages = store.getState().messageApprovals;
  const classes = store.getState().classes;

  const totalStudents = students.length;
  const activeFlagsCount = flags.filter((f) => f.status === 'ACTIVE').length;
  const openTasksCount = tasks.filter((t) => t.status === 'OPEN').length;

  // Class-wise attendance percentages
  const classWise = classes.map((cls) => {
    const enrolments = store.getState().enrolments.filter((e) => e.classId === cls.id);
    const studentIds = new Set(enrolments.map((e) => e.studentId));
    const clsRecords = attRecords.filter((r) => studentIds.has(r.studentId) && r.classId === cls.id);

    let present = 0;
    let excused = 0;
    let absent = 0;

    clsRecords.forEach((r) => {
      if (r.status === 'PRESENT' || r.status === 'LATE') present++;
      else if (r.status === 'EXCUSED') excused++;
      else if (r.status === 'ABSENT') absent++;
    });

    const held = clsRecords.length;
    const effDenominator = held - excused;
    const rate =
      effDenominator > 0
        ? Math.round(((present + excused) / effDenominator) * 1000) / 10
        : 100;

    return {
      classCode: cls.classCode,
      className: cls.name,
      enrolledCount: studentIds.size,
      recordsCount: held,
      attendancePercentage: Math.min(100, Math.max(0, rate)),
    };
  });

  // Overall attendance calculation
  let totalPresent = 0;
  let totalExcused = 0;
  attRecords.forEach((r) => {
    if (r.status === 'PRESENT' || r.status === 'LATE') totalPresent++;
    else if (r.status === 'EXCUSED') totalExcused++;
  });
  const totalHeld = attRecords.length;
  const overallAttendancePercent =
    totalHeld - totalExcused > 0
      ? Math.round(((totalPresent + totalExcused) / (totalHeld - totalExcused)) * 1000) / 10
      : 100;

  // Outreach summary
  const totalOutreach = messages.length;
  const approvedOutreach = messages.filter((m) => m.status === 'APPROVED').length;
  const pendingOutreach = messages.filter((m) => m.status === 'PENDING_APPROVAL').length;

  return res.json({
    success: true,
    metrics: {
      totalStudents,
      overallAttendancePercent: Math.min(100, overallAttendancePercent),
      attendanceFormula: '(present + excused) / (held - excused) * 100',
      activeFlagsCount,
      openTasksCount,
      classWise,
      outreachSummary: {
        total: totalOutreach,
        approved: approvedOutreach,
        pending: pendingOutreach,
        isSimulated: true,
      },
    },
  });
});

// ==========================================
// MODULE 5: AT-RISK STUDENT REST ENDPOINTS
// ==========================================

// GET /api/at-risk (Standard REST endpoint)
router.get('/at-risk', authenticate, (req: Request, res: Response) => {
  const { status, studentId, rule, severity } = req.query;
  let flags = store.getState().engagementFlags;

  if (status) {
    flags = flags.filter((f) => f.status === status);
  }
  if (studentId) {
    flags = flags.filter((f) => f.studentId === studentId);
  }
  if (rule) {
    flags = flags.filter((f) => f.rule === rule);
  }
  if (severity) {
    flags = flags.filter((f) => f.severity === severity);
  }

  const enriched = flags.map((f) => {
    const student = store.getState().students.find((s) => s.id === f.studentId);
    return {
      ...f,
      studentName: student ? student.name : 'Unknown Student',
      studentIdNumber: student ? student.studentIdNumber : '',
    };
  });

  return res.json({ success: true, flags: enriched, total: enriched.length });
});

// POST /api/at-risk/evaluate/:studentId (On-demand evaluation)
router.post(
  '/at-risk/evaluate/:studentId',
  authenticate,
  requireRole('ADMIN', 'ACADEMIC_COORDINATOR'),
  (req: Request, res: Response) => {
    const student = store.getState().students.find((s) => s.id === req.params.studentId);
    if (!student) {
      return res.status(404).json({ success: false, error: 'Student not found' });
    }

    const createdFlags = evaluateStudentAtRiskRules(student.id);
    const allFlags = store.getState().engagementFlags.filter((f) => f.studentId === student.id);

    return res.json({
      success: true,
      studentId: student.id,
      studentName: student.name,
      newFlagsGenerated: createdFlags.length,
      flags: allFlags,
    });
  }
);

// POST /api/at-risk/:id/resolve
router.post(
  '/at-risk/:id/resolve',
  authenticate,
  requireRole('ADMIN', 'ACADEMIC_COORDINATOR'),
  (req: Request, res: Response) => {
    const parsed = resolveEngagementFlagSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        error: 'Resolution notes are required',
        details: parsed.error.issues,
      });
    }

    const flag = store.getState().engagementFlags.find((f) => f.id === req.params.id);
    if (!flag) {
      return res.status(404).json({ success: false, error: 'Flag not found' });
    }

    flag.status = 'RESOLVED';
    flag.resolutionNotes = parsed.data.resolutionNotes;
    flag.updatedAt = new Date().toISOString();

    const associatedTask = store
      .getState()
      .interventionTasks.find((t) => t.flagId === flag.id && t.status === 'OPEN');
    if (associatedTask) {
      associatedTask.status = 'RESOLVED';
      associatedTask.resolutionReason = parsed.data.resolutionNotes;
      associatedTask.updatedAt = new Date().toISOString();
    }

    store.logAudit({
      userId: req.user?.id,
      userEmail: req.user?.email,
      action: 'AT_RISK_FLAG_RESOLVED',
      entityType: 'EngagementFlag',
      entityId: flag.id,
      details: { resolutionNotes: parsed.data.resolutionNotes },
    });

    return res.json({ success: true, flag });
  }
);

// POST /api/at-risk/:id/dismiss
router.post(
  '/at-risk/:id/dismiss',
  authenticate,
  requireRole('ADMIN', 'ACADEMIC_COORDINATOR'),
  (req: Request, res: Response) => {
    const parsed = dismissEngagementFlagSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        error: 'Dismissal reason is required',
        details: parsed.error.issues,
      });
    }

    const flag = store.getState().engagementFlags.find((f) => f.id === req.params.id);
    if (!flag) {
      return res.status(404).json({ success: false, error: 'Flag not found' });
    }

    flag.status = 'DISMISSED';
    flag.dismissalReason = parsed.data.dismissalReason;
    flag.updatedAt = new Date().toISOString();

    const associatedTask = store
      .getState()
      .interventionTasks.find((t) => t.flagId === flag.id && t.status === 'OPEN');
    if (associatedTask) {
      associatedTask.status = 'DISMISSED';
      associatedTask.resolutionReason = `Flag dismissed: ${parsed.data.dismissalReason}`;
      associatedTask.updatedAt = new Date().toISOString();
    }

    return res.json({ success: true, flag });
  }
);

// ==========================================
// TASKS REST ENDPOINTS (/api/tasks)
// ==========================================

// GET /api/tasks
router.get('/tasks', authenticate, (req: Request, res: Response) => {
  const { status, coordinatorId, studentId } = req.query;
  let tasks = store.getState().interventionTasks;

  if (status) {
    tasks = tasks.filter((t) => t.status === status);
  }
  if (coordinatorId) {
    tasks = tasks.filter((t) => t.coordinatorId === coordinatorId);
  }
  if (studentId) {
    tasks = tasks.filter((t) => t.studentId === studentId);
  }

  const now = new Date();
  const enriched = tasks.map((t) => ({
    ...t,
    isOverdue: t.status === 'OPEN' && new Date(t.dueDate).getTime() < now.getTime(),
  }));

  return res.json({ success: true, tasks: enriched, total: enriched.length });
});

// POST /api/tasks (Manual task creation)
router.post(
  '/tasks',
  authenticate,
  requireRole('ADMIN', 'ACADEMIC_COORDINATOR'),
  (req: Request, res: Response) => {
    const { studentId, severity = 'MEDIUM', evidence, recommendedAction, dueDate, notes } = req.body;
    if (!studentId || !evidence || !recommendedAction) {
      return res.status(400).json({
        success: false,
        error: 'Missing required task fields (studentId, evidence, recommendedAction)',
      });
    }

    const student = store.getState().students.find((s) => s.id === studentId);
    if (!student) {
      return res.status(404).json({ success: false, error: 'Student not found' });
    }

    const task = {
      id: `task-int-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
      studentId: student.id,
      studentName: student.name,
      flagId: null,
      coordinatorId: req.user?.id || 'u-coordinator-01',
      coordinatorName: req.user?.name || 'Coordinator',
      severity,
      evidence,
      recommendedAction,
      dueDate: dueDate || new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(),
      status: 'OPEN',
      notes: notes || 'Manual intervention task created',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    store.getState().interventionTasks.unshift(task);

    store.logAudit({
      userId: req.user?.id,
      userEmail: req.user?.email,
      action: 'INTERVENTION_TASK_CREATED',
      entityType: 'InterventionTask',
      entityId: task.id,
      details: { studentId: student.id, severity },
    });

    return res.status(201).json({ success: true, task });
  }
);

// PATCH /api/tasks/:id
router.patch(
  '/tasks/:id',
  authenticate,
  requireRole('ADMIN', 'ACADEMIC_COORDINATOR'),
  (req: Request, res: Response) => {
    const parsed = updateInterventionTaskSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        error: 'Invalid task update data',
        details: parsed.error.issues,
      });
    }

    const task = store.getState().interventionTasks.find((t) => t.id === req.params.id);
    if (!task) {
      return res.status(404).json({ success: false, error: 'Intervention task not found' });
    }

    Object.assign(task, parsed.data);
    task.updatedAt = new Date().toISOString();

    return res.json({ success: true, task });
  }
);

// ==========================================
// MODULE 6: PARENT MANAGEMENT (/api/parents)
// ==========================================

// GET /api/parents
router.get('/parents', authenticate, (req: Request, res: Response) => {
  const { studentId, search } = req.query;
  let guardians = store.getState().guardians;

  if (studentId) {
    guardians = guardians.filter((g) => g.studentId === studentId);
  }

  if (search) {
    const q = (search as string).toLowerCase();
    guardians = guardians.filter(
      (g) =>
        g.name.toLowerCase().includes(q) ||
        g.email.toLowerCase().includes(q) ||
        g.phone.includes(q)
    );
  }

  const enriched = guardians.map((g) => {
    const student = store.getState().students.find((s) => s.id === g.studentId);
    const pref = store.getState().guardianPreferences.find((p) => p.guardianId === g.id);
    return {
      ...g,
      studentName: student ? student.name : 'Unknown',
      studentIdNumber: student ? student.studentIdNumber : '',
      preferences: pref || null,
      consentVerified: pref ? Boolean(pref.consentGiven) : false,
    };
  });

  return res.json({ success: true, parents: enriched, total: enriched.length });
});

// GET /api/parents/:id
router.get('/parents/:id', authenticate, (req: Request, res: Response) => {
  const guardian = store.getState().guardians.find((g) => g.id === req.params.id || g.studentId === req.params.id);
  if (!guardian) {
    return res.status(404).json({ success: false, error: 'Parent / guardian not found' });
  }

  const student = store.getState().students.find((s) => s.id === guardian.studentId);
  const pref = store.getState().guardianPreferences.find((p) => p.guardianId === guardian.id);

  return res.json({
    success: true,
    parent: {
      ...guardian,
      studentName: student ? student.name : 'Unknown',
      studentIdNumber: student ? student.studentIdNumber : '',
      preferences: pref || null,
      consentVerified: pref ? Boolean(pref.consentGiven) : false,
    },
  });
});

// PATCH /api/parents/:id/preferences
router.patch(
  '/parents/:id/preferences',
  authenticate,
  requireRole('ADMIN', 'ACADEMIC_COORDINATOR'),
  (req: Request, res: Response) => {
    const parsed = parentPreferenceSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        error: 'Invalid guardian preferences',
        details: parsed.error.issues,
      });
    }

    const guardian = store.getState().guardians.find((g) => g.id === req.params.id || g.studentId === req.params.id);
    if (!guardian) {
      return res.status(404).json({ success: false, error: 'Parent / guardian not found' });
    }

    let pref = store.getState().guardianPreferences.find((p) => p.guardianId === guardian.id);
    if (!pref) {
      pref = {
        id: `pref-${guardian.id}`,
        guardianId: guardian.id,
        preferredChannel: 'WHATSAPP',
        consentGiven: true,
        quietHoursStart: '21:00',
        quietHoursEnd: '08:00',
      };
      store.getState().guardianPreferences.push(pref);
    }

    Object.assign(pref, parsed.data);

    store.logAudit({
      userId: req.user?.id,
      userEmail: req.user?.email,
      action: 'PARENT_PREFERENCES_UPDATED',
      entityType: 'GuardianPreference',
      entityId: pref.id,
      details: parsed.data,
    });

    return res.json({ success: true, preferences: pref });
  }
);

// ==========================================
// PARENT COMMUNICATIONS (/api/communications)
// ==========================================

// GET /api/communications (Alias of /messages)
router.get('/communications', authenticate, (req: Request, res: Response) => {
  const { status, studentId } = req.query;
  let messages = store.getState().messageApprovals;

  if (status) {
    messages = messages.filter((m) => m.status === status);
  }
  if (studentId) {
    messages = messages.filter((m) => m.studentId === studentId);
  }

  return res.json({ success: true, communications: messages, total: messages.length });
});

// POST /api/communications and POST /api/messages (Create draft)
const createMessageHandler = (req: Request, res: Response) => {
  const parsed = createMessageSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      success: false,
      error: 'Invalid message draft request',
      details: parsed.error.issues,
    });
  }

  const { studentId, draftContent, channel, summaryId } = parsed.data;
  const student = store.getState().students.find((s) => s.id === studentId);
  if (!student) {
    return res.status(404).json({ success: false, error: 'Student not found' });
  }

  const guardian = store.getState().guardians.find((g) => g.studentId === studentId);
  if (!guardian) {
    return res.status(404).json({ success: false, error: 'Guardian contact not registered for student' });
  }

  const pref = store.getState().guardianPreferences.find((p) => p.guardianId === guardian.id);
  const consentGiven = pref ? pref.consentGiven : true;

  const newDraft = {
    id: `msg-${Date.now()}`,
    studentId,
    studentName: student.name,
    guardianId: guardian.id,
    guardianName: guardian.name,
    guardianContact: guardian.phone,
    channel: channel || (pref?.preferredChannel as any) || 'WHATSAPP',
    summaryId: summaryId || null,
    draftContent,
    status: 'PENDING_APPROVAL',
    deliveryStatus: 'SIMULATED',
    deliveryAttemptCount: 0,
    isSimulated: true,
    consentVerified: consentGiven,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  store.getState().messageApprovals.unshift(newDraft);

  return res.status(201).json({
    success: true,
    message: newDraft,
    notice: 'Draft created in PENDING_APPROVAL status. Explicit coordinator approval required before delivery.',
  });
};

router.post('/communications', authenticate, requireRole('ADMIN', 'ACADEMIC_COORDINATOR'), createMessageHandler);
router.post('/messages', authenticate, requireRole('ADMIN', 'ACADEMIC_COORDINATOR'), createMessageHandler);

// POST /api/communications/:id/approve (Alias of /messages/:id/approve)
router.post(
  '/communications/:id/approve',
  authenticate,
  requireRole('ADMIN', 'ACADEMIC_COORDINATOR'),
  (req: Request, res: Response) => {
    const parsed = approveMessageSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        error: 'Invalid approval request',
        details: parsed.error.issues,
      });
    }

    const message = store.getState().messageApprovals.find((m) => m.id === req.params.id);
    if (!message) {
      return res.status(404).json({ success: false, error: 'Message draft not found' });
    }

    const pref = store
      .getState()
      .guardianPreferences.find((p) => p.guardianId === message.guardianId);

    if (pref && !pref.consentGiven) {
      return res.status(400).json({
        success: false,
        error: 'Cannot approve or dispatch message: Guardian has revoked communication consent.',
      });
    }

    const { approved, editedContent, rejectionReason } = parsed.data;

    if (approved) {
      message.status = 'APPROVED';
      message.approverId = req.user?.id || 'STAFF';
      message.approverName = req.user?.name || 'Staff Approver';
      message.approvedAt = new Date().toISOString();
      if (editedContent) message.draftContent = editedContent;

      message.deliveryStatus = 'SIMULATED';
      message.deliveryAttemptCount += 1;
      message.isSimulated = true;
      message.updatedAt = new Date().toISOString();

      store.logAudit({
        userId: req.user?.id,
        userEmail: req.user?.email,
        action: 'PARENT_COMMUNICATION_APPROVED_SIMULATED',
        entityType: 'MessageApproval',
        entityId: message.id,
        details: { guardianContact: message.guardianContact, channel: message.channel },
      });
    } else {
      message.status = 'REJECTED';
      message.deliveryError = rejectionReason || 'Rejected by coordinator review';
      message.updatedAt = new Date().toISOString();
    }

    return res.json({
      success: true,
      message,
      isSimulated: true,
      simulatedNotice: 'SIMULATED: Message dispatched safely in DEMO MODE.',
    });
  }
);

// ==========================================
// MODULE 7: CONSOLIDATED DASHBOARD APIS
// ==========================================

// GET /api/dashboard and GET /api/dashboard/overview
const dashboardOverviewHandler = (req: Request, res: Response) => {
  const leads = store.getState().leads;
  const counsellors = store.getState().counsellors;
  const students = store.getState().students;
  const attRecords = store.getState().attendanceRecords;
  const flags = store.getState().engagementFlags;
  const tasks = store.getState().interventionTasks;
  const messages = store.getState().messageApprovals;

  const totalEnquiries = leads.length;
  const hotLeads = leads.filter((l) => l.scoreCategory === 'HOT').length;
  const warmLeads = leads.filter((l) => l.scoreCategory === 'WARM').length;
  const coldLeads = leads.filter((l) => l.scoreCategory === 'COLD').length;

  const enrolled = leads.filter((l) => l.stage === 'Enrolled').length;
  const conversionRate = totalEnquiries > 0 ? Math.round((enrolled / totalEnquiries) * 1000) / 10 : 0;

  // Counsellor Performance
  const counsellorPerformance = counsellors.map((c) => ({
    id: c.id,
    name: c.name,
    currentWorkload: c.currentWorkload,
    maxWorkload: c.maxWorkload,
    utilizationPercent: Math.round((c.currentWorkload / c.maxWorkload) * 100),
    isAvailable: c.isAvailable,
  }));

  // Overall Attendance
  let totalPresent = 0;
  let totalExcused = 0;
  attRecords.forEach((r) => {
    if (r.status === 'PRESENT' || r.status === 'LATE') totalPresent++;
    else if (r.status === 'EXCUSED') totalExcused++;
  });
  const totalHeld = attRecords.length;
  const overallAttendancePercentage =
    totalHeld - totalExcused > 0
      ? Math.round(((totalPresent + totalExcused) / (totalHeld - totalExcused)) * 1000) / 10
      : 100;

  const atRiskStudentCount = new Set(
    flags.filter((f) => f.status === 'ACTIVE').map((f) => f.studentId)
  ).size;

  const pendingInterventionTasks = tasks.filter((t) => t.status === 'OPEN').length;

  const parentCommunicationStatus = {
    total: messages.length,
    approved: messages.filter((m) => m.status === 'APPROVED').length,
    pendingApproval: messages.filter((m) => m.status === 'PENDING_APPROVAL').length,
    rejected: messages.filter((m) => m.status === 'REJECTED').length,
    isSimulated: true,
    mode: 'DEMO MODE',
  };

  return res.json({
    success: true,
    dashboard: {
      admissions: {
        totalEnquiries,
        leadScoreDistribution: {
          hot: hotLeads,
          warm: warmLeads,
          cold: coldLeads,
        },
        enrolledCount: enrolled,
        conversionRate,
        counsellorPerformance,
      },
      academics: {
        totalStudents: students.length,
        overallAttendancePercentage: Math.min(100, overallAttendancePercentage),
        atRiskStudentCount,
        pendingInterventionTasks,
        parentCommunicationStatus,
      },
    },
  });
};

router.get('/dashboard', authenticate, dashboardOverviewHandler);
router.get('/dashboard/overview', authenticate, dashboardOverviewHandler);

export default router;

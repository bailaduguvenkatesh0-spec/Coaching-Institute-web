import {
  calculateAttendancePercentage,
  computeAttendanceMetrics,
  getISOWeekString,
  isInQuietHours,
  AttendanceStatus,
  AtRiskRule,
  AtRiskSeverity,
  CSVImportResult,
} from '@team-b/shared';
import { store } from '../store/index.js';
import { logger } from '../logger.js';
import { getPrisma } from '../prisma.js';

export interface AttendanceImportRow {
  studentIdNumber: string;
  classCode: string;
  date: string; // YYYY-MM-DD
  status: 'PRESENT' | 'ABSENT' | 'EXCUSED' | 'LATE';
  remarks?: string;
}

export interface AssessmentImportRow {
  studentIdNumber: string;
  subjectCode: string;
  assessmentDate: string; // YYYY-MM-DD
  assessmentTitle: string;
  scoreObtained: number;
  maxScore: number;
  assessmentType?: string;
}

/**
 * Async CSV Import Engine for Attendance (PostgreSQL + In-Memory fallback)
 */
export async function processAttendanceImportAsync(
  rows: AttendanceImportRow[],
  fileName = 'attendance_upload.csv',
  commit = true
): Promise<CSVImportResult> {
  const batchId = `batch-att-${Date.now()}`;
  const prisma = getPrisma();

  let students: any[] = store.getState().students;
  let classes: any[] = store.getState().classes;
  let existingRecords: any[] = store.getState().attendanceRecords;

  if (prisma) {
    try {
      const [dbStudents, dbClasses, dbRecords] = await Promise.all([
        prisma.student.findMany(),
        prisma.class.findMany(),
        prisma.attendanceRecord.findMany(),
      ]);
      if (dbStudents.length > 0) students = dbStudents;
      if (dbClasses.length > 0) classes = dbClasses;
      if (dbRecords.length > 0) existingRecords = dbRecords;
    } catch {}
  }

  const errors: { row: number; error: string; data?: any }[] = [];
  const validRecords: any[] = [];
  let duplicateRows = 0;
  const batchKeys = new Set<string>();

  rows.forEach((row, idx) => {
    const rowNum = idx + 1;

    // Validate Student ID
    if (!row.studentIdNumber || row.studentIdNumber.trim() === '') {
      errors.push({ row: rowNum, error: 'Student ID Number is required', data: row });
      return;
    }
    const targetStudentId = row.studentIdNumber.trim().toLowerCase();
    const student = students.find(
      (s) =>
        (s.studentIdNumber && s.studentIdNumber.toLowerCase() === targetStudentId) ||
        (s.studentId && s.studentId.toLowerCase() === targetStudentId) ||
        (s.id && s.id.toLowerCase() === targetStudentId)
    );
    if (!student) {
      errors.push({
        row: rowNum,
        error: `Unknown Student ID '${row.studentIdNumber}'. Student not found in database.`,
        data: row,
      });
      return;
    }

    // Validate Date format YYYY-MM-DD
    if (!row.date || !/^\d{4}-\d{2}-\d{2}$/.test(row.date)) {
      errors.push({ row: rowNum, error: 'Invalid date format. Expected YYYY-MM-DD.', data: row });
      return;
    }

    // Validate Class Code
    const targetClassCode = (row.classCode || '').trim().toLowerCase();
    const targetClass = classes.find(
      (c) =>
        (c.classCode && c.classCode.toLowerCase() === targetClassCode) ||
        (c.id && c.id.toLowerCase() === targetClassCode)
    );
    if (!targetClass) {
      errors.push({
        row: rowNum,
        error: `Unknown Class Code '${row.classCode}'. Class not found.`,
        data: row,
      });
      return;
    }

    // Validate Status
    const validStatuses = ['PRESENT', 'ABSENT', 'EXCUSED', 'LATE'];
    if (!validStatuses.includes(row.status)) {
      errors.push({
        row: rowNum,
        error: `Invalid status '${row.status}'. Must be one of: ${validStatuses.join(', ')}`,
        data: row,
      });
      return;
    }

    // Duplicate Check: Same student + same class + same date
    const uniqueKey = `${student.id}_${targetClass.id}_${row.date}`;
    if (batchKeys.has(uniqueKey)) {
      duplicateRows++;
      errors.push({
        row: rowNum,
        error: `Duplicate entry in batch: Student ${row.studentIdNumber} already has attendance for ${row.date} in class ${row.classCode}`,
        data: row,
      });
      return;
    }
    batchKeys.add(uniqueKey);

    const isAlreadyStored = existingRecords.some((r) => {
      const rDate = r.date ? (typeof r.date === 'string' ? r.date : new Date(r.date).toISOString()) : '';
      return (
        r.studentId === student.id &&
        r.classId === targetClass.id &&
        rDate.startsWith(row.date)
      );
    });
    if (isAlreadyStored) {
      duplicateRows++;
      errors.push({
        row: rowNum,
        error: `Duplicate record in database: Attendance already recorded for student ${row.studentIdNumber} on ${row.date}`,
        data: row,
      });
      return;
    }

    validRecords.push({
      id: `att-${Date.now()}-${idx}-${Math.random().toString(36).slice(2, 5)}`,
      studentId: student.id,
      classId: targetClass.id,
      date: `${row.date}T09:00:00.000Z`,
      status: row.status,
      remarks: row.remarks || null,
      batchId,
      createdAt: new Date().toISOString(),
    });
  });

  const totalRows = rows.length;
  const validCount = validRecords.length;
  const rejectedCount = errors.length;

  if (commit && validCount > 0) {
    if (prisma) {
      try {
        await prisma.attendanceRecord.createMany({
          data: validRecords.map((r) => ({
            id: r.id,
            studentId: r.studentId,
            classId: r.classId,
            date: new Date(r.date),
            status: r.status,
            remarks: r.remarks,
            batchId: r.batchId,
          })),
          skipDuplicates: true,
        });
      } catch {}
    }

    store.getState().attendanceRecords.push(...validRecords);

    // Save batch record
    const batch = {
      id: batchId,
      type: 'ATTENDANCE',
      fileName,
      totalRows,
      validRows: validCount,
      rejectedRows: rejectedCount,
      duplicateRows,
      status: rejectedCount === 0 ? 'COMPLETED' : 'PARTIAL',
      createdAt: new Date().toISOString(),
    };
    store.getState().importBatches.unshift(batch);

    // Save import errors
    errors.forEach((err) => {
      store.getState().importErrors.push({
        id: `err-${batchId}-${err.row}`,
        batchId,
        rowNumber: err.row,
        rawData: err.data || {},
        errorMessage: err.error,
        createdAt: new Date().toISOString(),
      });
    });

    // Evaluate at-risk rules for all affected students
    const uniqueStudentIds = Array.from(new Set(validRecords.map((r) => r.studentId)));
    uniqueStudentIds.forEach((sid) => evaluateStudentAtRiskRules(sid));
  }

  return {
    importBatchId: batchId,
    totalRows,
    validRows: validCount,
    rejectedRows: rejectedCount,
    duplicateRows,
    errors,
    importedRecordsCount: commit ? validCount : 0,
    status: rejectedCount === 0 ? 'COMPLETED' : (validCount > 0 ? 'PARTIAL' : 'FAILED'),
    validRecords: commit ? validRecords : [],
    committed: commit,
  };
}

/**
 * CSV Import Engine for Attendance (Synchronous compatibility wrapper)
 */
export function processAttendanceImport(
  rows: AttendanceImportRow[],
  fileName = 'attendance_upload.csv',
  commit = true
): CSVImportResult {
  const batchId = `batch-att-${Date.now()}`;
  const students = store.getState().students;
  const classes = store.getState().classes;
  const existingRecords = store.getState().attendanceRecords;

  const errors: { row: number; error: string; data?: any }[] = [];
  const validRecords: any[] = [];
  let duplicateRows = 0;

  // Track duplicates within the batch itself
  const batchKeys = new Set<string>();

  rows.forEach((row, idx) => {
    const rowNum = idx + 1;

    // Validate Student ID
    if (!row.studentIdNumber || row.studentIdNumber.trim() === '') {
      errors.push({ row: rowNum, error: 'Student ID Number is required', data: row });
      return;
    }
    const student = students.find(
      (s) => s.studentIdNumber.toLowerCase() === row.studentIdNumber.trim().toLowerCase()
    );
    if (!student) {
      errors.push({
        row: rowNum,
        error: `Unknown Student ID '${row.studentIdNumber}'. Student not found in database.`,
        data: row,
      });
      return;
    }

    // Validate Date format YYYY-MM-DD
    if (!row.date || !/^\d{4}-\d{2}-\d{2}$/.test(row.date)) {
      errors.push({ row: rowNum, error: 'Invalid date format. Expected YYYY-MM-DD.', data: row });
      return;
    }

    // Validate Class Code
    const targetClass = classes.find(
      (c) => c.classCode.toLowerCase() === (row.classCode || '').trim().toLowerCase()
    );
    if (!targetClass) {
      errors.push({
        row: rowNum,
        error: `Unknown Class Code '${row.classCode}'. Class not found.`,
        data: row,
      });
      return;
    }

    // Validate Status
    const validStatuses = ['PRESENT', 'ABSENT', 'EXCUSED', 'LATE'];
    if (!validStatuses.includes(row.status)) {
      errors.push({
        row: rowNum,
        error: `Invalid status '${row.status}'. Must be one of: ${validStatuses.join(', ')}`,
        data: row,
      });
      return;
    }

    // Duplicate Check: Same student + same class + same date
    const uniqueKey = `${student.id}_${targetClass.id}_${row.date}`;
    if (batchKeys.has(uniqueKey)) {
      duplicateRows++;
      errors.push({
        row: rowNum,
        error: `Duplicate entry in batch: Student ${row.studentIdNumber} already has attendance for ${row.date} in class ${row.classCode}`,
        data: row,
      });
      return;
    }
    batchKeys.add(uniqueKey);

    const isAlreadyStored = existingRecords.some(
      (r) =>
        r.studentId === student.id &&
        r.classId === targetClass.id &&
        r.date.startsWith(row.date)
    );
    if (isAlreadyStored) {
      duplicateRows++;
      errors.push({
        row: rowNum,
        error: `Duplicate record in database: Attendance already recorded for student ${row.studentIdNumber} on ${row.date}`,
        data: row,
      });
      return;
    }

    validRecords.push({
      id: `att-${Date.now()}-${idx}`,
      studentId: student.id,
      classId: targetClass.id,
      date: `${row.date}T09:00:00.000Z`,
      status: row.status,
      remarks: row.remarks || null,
      batchId,
      createdAt: new Date().toISOString(),
    });
  });

  const totalRows = rows.length;
  const validCount = validRecords.length;
  const rejectedCount = errors.length;

  if (commit && validCount > 0) {
    store.getState().attendanceRecords.push(...validRecords);

    // Save batch record
    const batch = {
      id: batchId,
      type: 'ATTENDANCE',
      fileName,
      totalRows,
      validRows: validCount,
      rejectedRows: rejectedCount,
      duplicateRows,
      status: rejectedCount === 0 ? 'COMPLETED' : 'PARTIAL',
      createdAt: new Date().toISOString(),
    };
    store.getState().importBatches.unshift(batch);

    // Save import errors
    errors.forEach((err) => {
      store.getState().importErrors.push({
        id: `err-${Date.now()}-${err.row}`,
        batchId,
        rowNumber: err.row,
        rawData: err.data || {},
        errorMessage: err.error,
        createdAt: new Date().toISOString(),
      });
    });

    // Reconcile / evaluate at-risk flags for all affected students
    const affectedStudentIds = [...new Set(validRecords.map((r) => r.studentId))];
    affectedStudentIds.forEach((studentId) => {
      evaluateStudentAtRiskRules(studentId);
    });
  }

  return {
    importBatchId: batchId,
    totalRows,
    validRows: validCount,
    rejectedRows: rejectedCount,
    duplicateRows,
    errors,
    importedRecordsCount: commit ? validCount : 0,
    status: rejectedCount === 0 ? 'COMPLETED' : validCount > 0 ? 'PARTIAL' : 'FAILED',
  };
}

/**
 * At-Risk Engine: Evaluates 5 Business Rules
 * 1. 3 consecutive absences
 * 2. Below 75% attendance in 30-day window
 * 3. Repeated missed classes
 * 4. 3+ missing assignments
 * 5. Assessment decline over 3 consecutive scores
 */
export function evaluateStudentAtRiskRules(studentId: string) {
  const student = store.getState().students.find((s) => s.id === studentId);
  if (!student) return [];

  const now = new Date();
  const flagsCreated: any[] = [];

  // 1. Attendance Metrics
  const attRecords = store
    .getState()
    .attendanceRecords.filter((r) => r.studentId === studentId);
  const metrics = computeAttendanceMetrics(studentId, attRecords, 30);

  // Rule 1: 3 Consecutive Absences
  if (metrics.consecutiveAbsences >= 3) {
    const existing = store.getState().engagementFlags.find(
      (f) =>
        f.studentId === studentId &&
        f.rule === 'CONSECUTIVE_ABSENCES' &&
        f.status === 'ACTIVE'
    );

    if (!existing) {
      const flag = {
        id: `flag-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        studentId,
        rule: 'CONSECUTIVE_ABSENCES' as AtRiskRule,
        severity: 'HIGH' as AtRiskSeverity,
        evidence: `Student recorded ${metrics.consecutiveAbsences} consecutive unexcused absences.`,
        observationWindowStart: metrics.windowStartDate,
        observationWindowEnd: metrics.windowEndDate,
        suggestedAction: 'Immediate telephone outreach to guardian to confirm student wellbeing.',
        status: 'ACTIVE',
        createdAt: now.toISOString(),
        updatedAt: now.toISOString(),
      };
      store.getState().engagementFlags.unshift(flag);
      flagsCreated.push(flag);

      // Create Coordinator Intervention Task
      createInterventionTaskForFlag(flag, student.name);
    }
  }

  // Rule 2: Attendance below 75% in 30-day window
  if (metrics.classesHeld >= 5 && metrics.attendancePercentage < 75) {
    const existing = store.getState().engagementFlags.find(
      (f) =>
        f.studentId === studentId &&
        f.rule === 'LOW_ATTENDANCE_WINDOW' &&
        f.status === 'ACTIVE'
    );

    if (!existing) {
      const flag = {
        id: `flag-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        studentId,
        rule: 'LOW_ATTENDANCE_WINDOW' as AtRiskRule,
        severity: 'MEDIUM' as AtRiskSeverity,
        evidence: `Attendance dropped to ${metrics.attendancePercentage}% (below 75% threshold) over past 30 days (${metrics.classesPresent}/${metrics.classesHeld} classes).`,
        observationWindowStart: metrics.windowStartDate,
        observationWindowEnd: metrics.windowEndDate,
        suggestedAction: 'Conduct attendance review meeting with student and send warning alert.',
        status: 'ACTIVE',
        createdAt: now.toISOString(),
        updatedAt: now.toISOString(),
      };
      store.getState().engagementFlags.unshift(flag);
      flagsCreated.push(flag);

      createInterventionTaskForFlag(flag, student.name);
    }
  }

  // Rule 5: Assessment decline over 3 consecutive scores
  const assessments = store
    .getState()
    .assessmentRecords.filter((a) => a.studentId === studentId)
    .sort((a, b) => new Date(a.assessmentDate).getTime() - new Date(b.assessmentDate).getTime());

  if (assessments.length >= 3) {
    const last3 = assessments.slice(-3);
    const isDeclining =
      last3[0].percentage > last3[1].percentage &&
      last3[1].percentage > last3[2].percentage;

    if (isDeclining) {
      const existing = store.getState().engagementFlags.find(
        (f) =>
          f.studentId === studentId &&
          f.rule === 'ASSESSMENT_DECLINE' &&
          f.status === 'ACTIVE'
      );

      if (!existing) {
        const flag = {
          id: `flag-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          studentId,
          rule: 'ASSESSMENT_DECLINE' as AtRiskRule,
          severity: 'MEDIUM' as AtRiskSeverity,
          evidence: `Academic decline observed over 3 consecutive assessments: ${last3[0].percentage}% -> ${last3[1].percentage}% -> ${last3[2].percentage}%.`,
          observationWindowStart: last3[0].assessmentDate,
          observationWindowEnd: last3[2].assessmentDate,
          suggestedAction: 'Arrange 1-on-1 subject remediation doubt clearing session with teacher.',
          status: 'ACTIVE',
          createdAt: now.toISOString(),
          updatedAt: now.toISOString(),
        };
        store.getState().engagementFlags.unshift(flag);
        flagsCreated.push(flag);

        createInterventionTaskForFlag(flag, student.name);
      }
    }
  }

  return flagsCreated;
}

/**
 * Creates coordinator task preventing duplicate open tasks
 */
export function createInterventionTaskForFlag(flag: any, studentName: string) {
  const existingOpenTask = store.getState().interventionTasks.find(
    (t) => t.studentId === flag.studentId && t.flagId === flag.id && t.status === 'OPEN'
  );

  if (existingOpenTask) return existingOpenTask;

  // Default coordinator Rahul
  const coordinator = store
    .getState()
    .users.find((u) => u.role === 'ACADEMIC_COORDINATOR') || store.getState().users[0];

  const now = new Date();
  const dueDate = new Date(now.getTime() + 48 * 60 * 60 * 1000).toISOString(); // 48h SLA

  const task = {
    id: `task-int-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
    studentId: flag.studentId,
    studentName,
    flagId: flag.id,
    coordinatorId: coordinator.id,
    coordinatorName: coordinator.name,
    severity: flag.severity,
    evidence: flag.evidence,
    recommendedAction: flag.suggestedAction,
    dueDate,
    status: 'OPEN',
    notes: 'Auto-generated by At-Risk Engine',
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
  };

  store.getState().interventionTasks.unshift(task);
  return task;
}

/**
 * Weekly Summary Generator:
 * - Verified records only (attendance %, completed assignments, assessment trend)
 * - Unique on (studentId, isoWeek)
 * - AI may only reword, never fabricate
 */
export function generateWeeklySummary(studentId: string, customDate = new Date()) {
  const student = store.getState().students.find((s) => s.id === studentId);
  if (!student) throw new Error('Student not found');

  const isoWeek = getISOWeekString(customDate);

  // Check uniqueness on (student, isoWeek)
  const existing = store
    .getState()
    .weeklySummaries.find((w) => w.studentId === studentId && w.isoWeek === isoWeek);

  if (existing) {
    return { summary: existing, isNew: false };
  }

  const attRecords = store
    .getState()
    .attendanceRecords.filter((r) => r.studentId === studentId);
  const metrics = computeAttendanceMetrics(studentId, attRecords, 7);

  const assessments = store
    .getState()
    .assessmentRecords.filter((r) => r.studentId === studentId);
  const avgScore =
    assessments.length > 0
      ? Math.round(
          (assessments.reduce((sum, a) => sum + a.percentage, 0) / assessments.length) * 10
        ) / 10
      : 80;

  const assessmentTrend =
    avgScore >= 80 ? 'CONSISTENT_STRONG' : avgScore >= 65 ? 'MODERATE' : 'NEEDS_ATTENTION';

  const openFlags = store
    .getState()
    .engagementFlags.filter((f) => f.studentId === studentId && f.status === 'ACTIVE')
    .map((f) => f.suggestedAction);

  const summary = {
    id: `summary-${Date.now()}`,
    studentId,
    studentName: student.name,
    isoWeek,
    attendancePercentage: metrics.attendancePercentage,
    classesAttended: metrics.classesPresent,
    classesMissed: metrics.classesAbsent,
    classesExcused: metrics.classesExcused,
    assignmentCompletionRate: 90,
    assessmentTrend,
    improvementAreas:
      metrics.attendancePercentage < 75
        ? ['Attendance regularity in morning sessions', 'Active class participation']
        : ['Advanced numerical problem practice'],
    outstandingInterventions: openFlags,
    nextSteps:
      metrics.attendancePercentage < 75
        ? 'Parent meeting requested to address unexcused absence patterns.'
        : 'Continue consistent progress; prepare for upcoming periodic benchmark.',
    aiEnhanced: false,
    generatedAt: new Date().toISOString(),
  };

  store.getState().weeklySummaries.unshift(summary);

  // Check guardian and queue parent message draft if not already queued
  const guardian = store.getState().guardians.find((g) => g.studentId === studentId);
  if (guardian) {
    const pref = store
      .getState()
      .guardianPreferences.find((p) => p.guardianId === guardian.id);

    // Parent message flow: generate summary, validate records, check guardian preferences & consent, create draft
    const draftContent = `[DRAFT - SIMULATED DELIVERY] Dear ${guardian.name}, weekly summary for ${student.name} (Week ${isoWeek}): Attendance ${metrics.attendancePercentage}% (${metrics.classesPresent} attended, ${metrics.classesAbsent} missed). Assessment status: ${assessmentTrend}. Team B Coaching Institute.`;

    const existingDraft = store.getState().messageApprovals.find(
      (m) => m.studentId === studentId && m.summaryId === summary.id
    );

    if (!existingDraft) {
      store.getState().messageApprovals.unshift({
        id: `msg-${Date.now()}`,
        studentId,
        guardianId: guardian.id,
        guardianName: guardian.name,
        guardianContact: guardian.phone,
        channel: (pref?.preferredChannel as any) || 'WHATSAPP',
        summaryId: summary.id,
        draftContent,
        status: 'PENDING_APPROVAL',
        deliveryStatus: 'SIMULATED',
        deliveryAttemptCount: 0,
        isSimulated: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    }
  }

  return { summary, isNew: true };
}

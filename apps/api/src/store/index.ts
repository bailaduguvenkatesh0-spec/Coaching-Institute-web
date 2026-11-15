import {
  SEED_USERS,
  SEED_COUNSELLORS,
  SEED_COURSES,
  SEED_CLASSES,
  SEED_STUDENTS,
  SEED_LEADS,
  SEED_STAFF,
  SEED_SYSTEM_SETTINGS,
} from './seedData.js';
import {
  calculateAttendancePercentage,
  calculateLeadScore,
  getISOWeekString,
} from '@team-b/shared';

// High-fidelity in-memory state store with deterministic initial seed
export interface AppState {
  users: typeof SEED_USERS;
  counsellors: typeof SEED_COUNSELLORS;
  courses: typeof SEED_COURSES;
  classes: typeof SEED_CLASSES;
  students: any[];
  guardians: any[];
  guardianPreferences: any[];
  enrolments: any[];
  leads: any[];
  leadStageHistory: any[];
  leadScoreHistory: any[];
  leadAssignments: any[];
  followUpTasks: any[];
  communicationConsents: any[];
  communicationLogs: any[];
  leadMergeReviews: any[];
  attendanceRecords: any[];
  assessmentRecords: any[];
  assignmentRecords: any[];
  importBatches: any[];
  importErrors: any[];
  engagementFlags: any[];
  interventionTasks: any[];
  weeklySummaries: any[];
  messageApprovals: any[];
  auditLogs: any[];
  idempotencyRecords: any[];
  systemSettings: typeof SEED_SYSTEM_SETTINGS;
  automationRuns: any[];
  staff: any[];
}

export function createInitialState(): AppState {
  const students: any[] = [];
  const guardians: any[] = [];
  const guardianPreferences: any[] = [];
  const enrolments: any[] = [];

  for (const s of SEED_STUDENTS) {
    students.push({
      id: s.id,
      studentIdNumber: s.studentIdNumber,
      name: s.name,
      email: s.email,
      phone: s.phone,
      enrollmentStatus: s.enrollmentStatus,
      createdAt: '2026-10-01T00:00:00.000Z',
    });

    enrolments.push({
      id: `enr-${s.id}`,
      studentId: s.id,
      classId: s.classId,
      status: 'ACTIVE',
      enrolledAt: '2026-10-01T00:00:00.000Z',
    });

    const gId = `g-${s.id}`;
    guardians.push({
      id: gId,
      studentId: s.id,
      name: s.guardian.name,
      relationship: s.guardian.relationship,
      email: s.guardian.email,
      phone: s.guardian.phone,
      createdAt: '2026-10-01T00:00:00.000Z',
    });

    guardianPreferences.push({
      id: `pref-${gId}`,
      guardianId: gId,
      preferredChannel: s.guardian.preferredChannel,
      consentGiven: s.guardian.consentGiven,
      quietHoursStart: '21:00',
      quietHoursEnd: '08:00',
    });
  }

  // Pre-seed realistic attendance records for the 5 students
  const attendanceRecords: any[] = [];
  const dates = [
    '2026-10-15',
    '2026-10-16',
    '2026-10-17',
    '2026-10-18',
    '2026-10-19',
    '2026-10-20',
    '2026-10-21',
    '2026-10-22',
    '2026-10-23',
    '2026-10-24',
  ];

  // Student 1 (Aadhav): Excellent attendance (100%)
  for (const d of dates) {
    attendanceRecords.push({
      id: `att-aadhav-${d}`,
      studentId: 's-aadhav-01',
      classId: 'class-jee-batch-a',
      date: `${d}T09:00:00.000Z`,
      status: 'PRESENT',
      remarks: 'On time',
      createdAt: `${d}T09:05:00.000Z`,
    });
  }

  // Student 3 (Rohit): 3 consecutive absences on 22, 23, 24 Oct (At-risk rule 1 test)
  for (let i = 0; i < dates.length; i++) {
    const d = dates[i];
    const isConsecutiveAbsent = i >= dates.length - 3;
    attendanceRecords.push({
      id: `att-rohit-${d}`,
      studentId: 's-rohit-03',
      classId: 'class-jee-batch-a',
      date: `${d}T09:00:00.000Z`,
      status: isConsecutiveAbsent ? 'ABSENT' : 'PRESENT',
      remarks: isConsecutiveAbsent ? 'Unexcused absence' : 'Present',
      createdAt: `${d}T09:05:00.000Z`,
    });
  }

  // Student 5 (Kavya): 4 present, 2 excused, 4 absent -> (4+2)/(10-2)*100 = 6/8*100 = 75.0%
  for (let i = 0; i < dates.length; i++) {
    const d = dates[i];
    let st = 'PRESENT';
    if (i < 4) st = 'PRESENT';
    else if (i < 6) st = 'EXCUSED';
    else st = 'ABSENT';

    attendanceRecords.push({
      id: `att-kavya-${d}`,
      studentId: 's-kavya-05',
      classId: 'class-fnd-batch-c',
      date: `${d}T09:00:00.000Z`,
      status: st,
      remarks: st === 'EXCUSED' ? 'Medical leave slip provided' : undefined,
      createdAt: `${d}T09:05:00.000Z`,
    });
  }

  // Pre-seed assessment records (Student 4 Ananya: 3 consecutive declining scores)
  const assessmentRecords: any[] = [
    {
      id: 'as-ananya-01',
      studentId: 's-ananya-04',
      subjectCode: 'BIO-101',
      assessmentDate: '2026-10-05T00:00:00.000Z',
      assessmentTitle: 'Cell Biology Quiz 1',
      assessmentType: 'QUIZ',
      scoreObtained: 85,
      maxScore: 100,
      percentage: 85,
    },
    {
      id: 'as-ananya-02',
      studentId: 's-ananya-04',
      subjectCode: 'BIO-101',
      assessmentDate: '2026-10-12T00:00:00.000Z',
      assessmentTitle: 'Genetics Quiz 2',
      assessmentType: 'QUIZ',
      scoreObtained: 72,
      maxScore: 100,
      percentage: 72,
    },
    {
      id: 'as-ananya-03',
      studentId: 's-ananya-04',
      subjectCode: 'BIO-101',
      assessmentDate: '2026-10-19T00:00:00.000Z',
      assessmentTitle: 'Ecology Quiz 3',
      assessmentType: 'QUIZ',
      scoreObtained: 58,
      maxScore: 100,
      percentage: 58,
    },
  ];

  // Pre-seed Engagement Flags
  const engagementFlags: any[] = [
    {
      id: 'flag-rohit-01',
      studentId: 's-rohit-03',
      rule: 'CONSECUTIVE_ABSENCES',
      severity: 'HIGH',
      evidence: 'Student recorded 3 consecutive unexcused absences between 2026-10-22 and 2026-10-24.',
      observationWindowStart: '2026-10-22T00:00:00.000Z',
      observationWindowEnd: '2026-10-24T23:59:59.000Z',
      suggestedAction: 'Immediate telephone outreach to guardian to confirm student wellbeing.',
      status: 'ACTIVE',
      createdAt: '2026-10-24T18:00:00.000Z',
    },
    {
      id: 'flag-ananya-02',
      studentId: 's-ananya-04',
      rule: 'ASSESSMENT_DECLINE',
      severity: 'MEDIUM',
      evidence: 'Assessment scores declined consistently over last 3 tests: 85% -> 72% -> 58%.',
      observationWindowStart: '2026-10-05T00:00:00.000Z',
      observationWindowEnd: '2026-10-19T23:59:59.000Z',
      suggestedAction: 'Schedule 1-on-1 remedial doubt clearing session with subject teacher.',
      status: 'ACTIVE',
      createdAt: '2026-10-20T10:00:00.000Z',
    },
  ];

  // Pre-seed Coordinator Intervention Tasks
  const interventionTasks: any[] = [
    {
      id: 'task-int-01',
      studentId: 's-rohit-03',
      flagId: 'flag-rohit-01',
      coordinatorId: 'u-coordinator-01',
      severity: 'HIGH',
      evidence: '3 consecutive absences in JEE Alpha Batch',
      recommendedAction: 'Call parent Suresh Verma regarding missed sessions and catch-up plan',
      dueDate: '2026-10-26T17:00:00.000Z',
      status: 'OPEN',
      notes: 'Initial SMS notification triggered',
      createdAt: '2026-10-24T18:30:00.000Z',
      updatedAt: '2026-10-24T18:30:00.000Z',
    },
  ];

  // Pre-seed Follow-up Tasks for Counsellor Priya
  const followUpTasks: any[] = [
    {
      id: 'task-fu-01',
      leadId: 'lead-001-hot',
      counsellorId: 'c-priya-01',
      attemptNumber: 1,
      dueAt: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
      scheduledAt: new Date().toISOString(),
      status: 'OPEN',
      notes: 'Initial 15-minute SLA contact for hot lead',
      isOverdue: false,
      createdAt: new Date().toISOString(),
    },
  ];

  // Pre-seed Message Approval Draft
  const messageApprovals: any[] = [
    {
      id: 'msg-app-01',
      studentId: 's-aadhav-01',
      guardianId: 'g-s-aadhav-01',
      summaryId: null,
      channel: 'WHATSAPP',
      draftContent:
        '[DRAFT] Dear Mr. Ramanathan, Aadhav maintained 100% attendance this week in JEE Alpha Batch. Keep up the great effort! Team B Coaching Institute.',
      status: 'PENDING_APPROVAL',
      deliveryStatus: 'SIMULATED',
      deliveryAttemptCount: 0,
      isSimulated: true,
      createdAt: '2026-10-25T10:00:00.000Z',
      updatedAt: '2026-10-25T10:00:00.000Z',
    },
  ];

  return {
    users: [...SEED_USERS],
    counsellors: [...SEED_COUNSELLORS],
    courses: [...SEED_COURSES],
    classes: [...SEED_CLASSES],
    students,
    guardians,
    guardianPreferences,
    enrolments,
    leads: [...SEED_LEADS],
    leadStageHistory: [],
    leadScoreHistory: [],
    leadAssignments: [],
    followUpTasks,
    communicationConsents: [],
    communicationLogs: [],
    leadMergeReviews: [],
    attendanceRecords,
    assessmentRecords,
    assignmentRecords: [],
    importBatches: [],
    importErrors: [],
    engagementFlags,
    interventionTasks,
    weeklySummaries: [],
    messageApprovals,
    auditLogs: [],
    idempotencyRecords: [],
    systemSettings: { ...SEED_SYSTEM_SETTINGS },
    automationRuns: [],
    staff: [...SEED_STAFF],
  };
}

class Store {
  private state: AppState = createInitialState();

  public getState(): AppState {
    return this.state;
  }

  public get staff(): any[] {
    return this.state.staff;
  }

  public set staff(val: any[]) {
    this.state.staff = val;
  }

  public reset(isProductionCheck = false) {
    if (isProductionCheck && process.env.NODE_ENV === 'production') {
      throw new Error('Safety block: Reset forbidden in production');
    }
    this.state = createInitialState();
  }

  // Audit Logger Helper
  public logAudit(entry: {
    userId?: string;
    userEmail?: string;
    action: string;
    entityType: string;
    entityId?: string;
    details?: any;
    ipAddress?: string;
  }) {
    const record = {
      id: `audit-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      createdAt: new Date().toISOString(),
      ...entry,
    };
    this.state.auditLogs.unshift(record);
    return record;
  }

  // Idempotency check helper
  public getIdempotency(key: string) {
    return this.state.idempotencyRecords.find((r) => r.idempotencyKey === key);
  }

  public setIdempotency(record: {
    idempotencyKey: string;
    endpoint: string;
    requestHash: string;
    responseStatus: number;
    responseBody: any;
  }) {
    const item = {
      id: `idem-${Date.now()}`,
      createdAt: new Date().toISOString(),
      ...record,
    };
    this.state.idempotencyRecords.push(item);
    return item;
  }
}

export const store = new Store();

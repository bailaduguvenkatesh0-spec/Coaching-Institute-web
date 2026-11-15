import {
  UserRole,
  LeadStage,
  LeadScoreCategory,
  LeadSource,
  AttendanceStatus,
  AtRiskRule,
  AtRiskSeverity,
  TaskStatus,
  MessageApprovalStatus,
  DeliveryStatus,
  CommunicationChannel,
} from '../constants/index.js';

// Auth & User Types
export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  isActive: boolean;
  createdAt: string;
}

// Project 1: Admissions Types
export interface LeadScoreFactor {
  factor: string;
  weight: number;
  score: number;
  maxScore: number;
  reason: string;
}

export interface LeadScoreBreakdown {
  total: number;
  category: LeadScoreCategory;
  factors: LeadScoreFactor[];
  reasons: string[];
  calculatedAt: string;
}

export interface CounsellorRoutingResult {
  counsellorId: string | null;
  counsellorName: string | null;
  matchedReason: string;
  isFallback: boolean;
  workload: number;
  maxWorkload: number;
}

export interface LeadItem {
  id: string;
  studentName: string;
  email: string;
  phone: string;
  rawEmail?: string;
  rawPhone?: string;
  courseInterest: string;
  preferredStartDate?: string | null;
  preferredCounsellingTime?: string | null;
  source: LeadSource;
  stage: LeadStage;
  score: number;
  scoreCategory: LeadScoreCategory;
  scoreDetails?: LeadScoreBreakdown | null;
  assignedCounsellorId?: string | null;
  assignedCounsellor?: {
    id: string;
    name: string;
    email: string;
  } | null;
  freeTextInterests?: string | null;
  aiSummary?: string | null;
  communicationConsent: boolean;
  optedOut: boolean;
  lossReason?: string | null;
  createdAt: string;
  updatedAt: string;
  lastContactedAt?: string | null;
}

export interface CounsellorItem {
  id: string;
  userId: string;
  name: string;
  email: string;
  supportedCourses: string[];
  workingHoursStart: string;
  workingHoursEnd: string;
  isAvailable: boolean;
  maxWorkload: number;
  currentWorkload: number;
}

export interface FollowUpTaskItem {
  id: string;
  leadId: string;
  counsellorId: string;
  attemptNumber: number;
  dueAt: string;
  scheduledAt: string;
  status: TaskStatus;
  notes?: string | null;
  completedAt?: string | null;
  isOverdue: boolean;
}

// Project 2: Academic Types
export interface StudentItem {
  id: string;
  studentIdNumber: string;
  name: string;
  email: string;
  phone?: string | null;
  enrollmentStatus: string;
  guardians: GuardianItem[];
  classes: ClassEnrollmentItem[];
  createdAt: string;
}

export interface GuardianItem {
  id: string;
  name: string;
  relationship: string;
  email: string;
  phone: string;
  preferredChannel: CommunicationChannel;
  consentGiven: boolean;
  quietHoursStart?: string;
  quietHoursEnd?: string;
}

export interface ClassEnrollmentItem {
  classId: string;
  className: string;
  courseName: string;
  enrolledAt: string;
}

export interface AttendanceCalculationResult {
  studentId: string;
  periodDays: number;
  classesHeld: number;
  classesPresent: number;
  classesExcused: number;
  classesAbsent: number;
  classesLate: number;
  // Formula: (present + excused) / (held - excused) * 100
  attendancePercentage: number;
  consecutiveAbsences: number;
  windowStartDate: string;
  windowEndDate: string;
}

export interface EngagementFlagItem {
  id: string;
  studentId: string;
  studentName: string;
  rule: AtRiskRule;
  severity: AtRiskSeverity;
  evidence: string;
  observationWindowStart: string;
  observationWindowEnd: string;
  suggestedAction: string;
  status: 'ACTIVE' | 'RESOLVED' | 'DISMISSED';
  dismissalReason?: string | null;
  resolutionNotes?: string | null;
  createdAt: string;
}

export interface InterventionTaskItem {
  id: string;
  studentId: string;
  studentName: string;
  coordinatorId: string;
  coordinatorName: string;
  flagId?: string | null;
  severity: AtRiskSeverity;
  evidence: string;
  recommendedAction: string;
  dueDate: string;
  status: TaskStatus;
  notes?: string | null;
  resolutionReason?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface WeeklySummaryItem {
  id: string;
  studentId: string;
  studentName: string;
  isoWeek: string; // e.g., '2026-W44'
  attendancePercentage: number;
  classesAttended: number;
  classesMissed: number;
  classesExcused: number;
  assignmentCompletionRate: number;
  assessmentTrend: string;
  improvementAreas: string[];
  outstandingInterventions: string[];
  nextSteps: string;
  aiEnhanced: boolean;
  generatedAt: string;
}

export interface MessageApprovalItem {
  id: string;
  studentId: string;
  guardianId: string;
  guardianName: string;
  guardianContact: string;
  channel: CommunicationChannel;
  summaryId?: string | null;
  draftContent: string;
  status: MessageApprovalStatus;
  approverId?: string | null;
  approverName?: string | null;
  approvedAt?: string | null;
  deliveryStatus: DeliveryStatus;
  deliveryAttemptCount: number;
  deliveryError?: string | null;
  isSimulated: boolean;
  createdAt: string;
}

// CSV Import Types
export interface CSVImportResult {
  importBatchId: string;
  totalRows: number;
  validRows: number;
  rejectedRows: number;
  duplicateRows: number;
  errors: { row: number; error: string; data?: Record<string, unknown> }[];
  importedRecordsCount: number;
  status: 'COMPLETED' | 'PARTIAL' | 'FAILED';
}

// System Settings Type
export interface SystemSettingsConfig {
  appTimezone: string;
  quietHoursStart: string;
  quietHoursEnd: string;
  slaInitialContactMinutes: number;
  followUpDelaysDays: number[];
  maxFollowUpAttempts: number;
  hotLeadThreshold: number;
  warmLeadThreshold: number;
  attendanceWarningThresholdPercent: number;
  consecutiveAbsenceLimit: number;
  missingAssignmentsLimit: number;
}

// Staff Management Types
export type EmploymentStatus = 'ACTIVE' | 'INACTIVE' | 'ON_LEAVE' | 'TERMINATED';

export interface StaffItem {
  id: string;
  staffId: string;
  fullName: string;
  email?: string | null;
  phone?: string | null;
  designation?: string | null;
  department?: string | null;
  joiningDate?: string | null;
  employmentStatus: EmploymentStatus;
  createdAt: string;
  updatedAt: string;
}


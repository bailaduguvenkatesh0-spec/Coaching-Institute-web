// Fixed Business Defaults & System Constants

export const USER_ROLES = {
  ADMIN: 'ADMIN',
  ADMISSIONS_COUNSELLOR: 'ADMISSIONS_COUNSELLOR',
  ACADEMIC_COORDINATOR: 'ACADEMIC_COORDINATOR',
  TEACHER: 'TEACHER',
} as const;

export type UserRole = (typeof USER_ROLES)[keyof typeof USER_ROLES];

// Project 1: Admissions Constants
export const LEAD_STAGES = [
  'New',
  'Contacted',
  'Counselling Booked',
  'Attended',
  'Application Started',
  'Enrolled',
  'Lost',
  'Nurture',
] as const;

export type LeadStage = (typeof LEAD_STAGES)[number];

export const LEAD_SCORE_CATEGORIES = {
  HOT: 'HOT',     // >= 70
  WARM: 'WARM',   // 40 - 69
  COLD: 'COLD',   // < 40
} as const;

export type LeadScoreCategory = (typeof LEAD_SCORE_CATEGORIES)[keyof typeof LEAD_SCORE_CATEGORIES];

export const LEAD_SOURCES = [
  'WEB_FORM',
  'SIMULATED_WHATSAPP',
  'INCOMING_CALL',
  'REFERRAL',
  'CSV_IMPORT',
  'EXTERNAL_CAMPAIGN',
] as const;

export type LeadSource = (typeof LEAD_SOURCES)[number];

// Default SLA & Follow-up Timings
export const DEFAULT_SLA_INITIAL_CONTACT_MINUTES = 15;
export const DEFAULT_FOLLOW_UP_INTERVALS_DAYS = [1, 3, 7];
export const DEFAULT_MAX_FOLLOW_UP_ATTEMPTS = 3;
export const DEFAULT_QUIET_HOURS_START = '21:00';
export const DEFAULT_QUIET_HOURS_END = '08:00';
export const DEFAULT_APP_TIMEZONE = 'Asia/Kolkata';

// Project 2: Academic Constants
export const ATTENDANCE_STATUSES = [
  'PRESENT',
  'ABSENT',
  'EXCUSED',
  'LATE',
] as const;

export type AttendanceStatus = (typeof ATTENDANCE_STATUSES)[number];

export const AT_RISK_RULES = {
  CONSECUTIVE_ABSENCES: 'CONSECUTIVE_ABSENCES',       // 3 consecutive absences
  LOW_ATTENDANCE_WINDOW: 'LOW_ATTENDANCE_WINDOW',     // below 75% in 30-day window
  REPEATED_MISSED_CLASSES: 'REPEATED_MISSED_CLASSES', // repeated missed classes
  MISSING_ASSIGNMENTS: 'MISSING_ASSIGNMENTS',         // 3+ missing assignments
  ASSESSMENT_DECLINE: 'ASSESSMENT_DECLINE',           // decline over 3 consecutive scores
} as const;

export type AtRiskRule = (typeof AT_RISK_RULES)[keyof typeof AT_RISK_RULES];

export const AT_RISK_SEVERITIES = {
  LOW: 'LOW',
  MEDIUM: 'MEDIUM',
  HIGH: 'HIGH',
  CRITICAL: 'CRITICAL',
} as const;

export type AtRiskSeverity = (typeof AT_RISK_SEVERITIES)[keyof typeof AT_RISK_SEVERITIES];

export const TASK_STATUSES = [
  'OPEN',
  'IN_PROGRESS',
  'RESOLVED',
  'DISMISSED',
] as const;

export type TaskStatus = (typeof TASK_STATUSES)[number];

export const MESSAGE_APPROVAL_STATUSES = [
  'DRAFT',
  'PENDING_APPROVAL',
  'APPROVED',
  'REJECTED',
  'SENT',
  'FAILED',
] as const;

export type MessageApprovalStatus = (typeof MESSAGE_APPROVAL_STATUSES)[number];

export const DELIVERY_STATUSES = [
  'SIMULATED',
  'QUEUED',
  'DELIVERED',
  'FAILED',
] as const;

export type DeliveryStatus = (typeof DELIVERY_STATUSES)[number];

export const COMMUNICATION_CHANNELS = [
  'SMS',
  'WHATSAPP',
  'EMAIL',
] as const;

export type CommunicationChannel = (typeof COMMUNICATION_CHANNELS)[number];

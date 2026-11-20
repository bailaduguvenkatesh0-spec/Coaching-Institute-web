import { z } from 'zod';
import {
  LEAD_STAGES,
  LEAD_SOURCES,
  ATTENDANCE_STATUSES,
  AT_RISK_RULES,
  AT_RISK_SEVERITIES,
  TASK_STATUSES,
  MESSAGE_APPROVAL_STATUSES,
  COMMUNICATION_CHANNELS,
} from '../constants/index.js';

// Auth Schemas
export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

export const registerSchema = z.object({
  email: z.string().trim().toLowerCase().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  name: z.string().min(2, 'Name must have at least 2 characters'),
  role: z.enum([
    'ADMIN',
    'MANAGER',
    'COUNSELLOR',
    'FACULTY',
    'ACCOUNTANT',
    'STUDENT',
    'PARENT',
    'ADMISSIONS_COUNSELLOR',
    'ACADEMIC_COORDINATOR',
    'TEACHER',
  ]).default('FACULTY'),
});

// Project 1: Admissions Schemas
export const createLeadSchema = z.object({
  studentName: z.string().min(2, 'Student name must have at least 2 characters'),
  email: z.string().trim().toLowerCase().email('Invalid email address'),
  phone: z.string().trim().min(7, 'Phone number must be at least 7 digits'),
  courseInterest: z.string().min(1, 'Course interest is required'),
  preferredStartDate: z.string().optional().nullable(),
  preferredCounsellingTime: z.string().optional().nullable(),
  source: z.enum(LEAD_SOURCES).default('WEB_FORM'),
  freeTextInterests: z.string().max(1000).optional().nullable(),
  communicationConsent: z.boolean().default(false),
  idempotencyKey: z.string().optional(),
});

export const updateLeadStageSchema = z.object({
  stage: z.enum(LEAD_STAGES),
  lossReason: z.string().optional().nullable(),
  note: z.string().optional(),
});

export const assignLeadSchema = z.object({
  counsellorId: z.string().uuid('Invalid counsellor UUID').nullable(),
  manualOverride: z.boolean().default(false),
  reason: z.string().optional(),
});

export const counsellorUpdateSchema = z.object({
  isAvailable: z.boolean().optional(),
  maxWorkload: z.number().int().positive().optional(),
  workingHoursStart: z.string().regex(/^\d{2}:\d{2}$/, 'Format must be HH:MM').optional(),
  workingHoursEnd: z.string().regex(/^\d{2}:\d{2}$/, 'Format must be HH:MM').optional(),
  supportedCourses: z.array(z.string()).optional(),
});

// Project 2: Academic Schemas
export const attendanceImportRowSchema = z.object({
  studentIdNumber: z.string().min(1, 'Student ID is required'),
  classCode: z.string().min(1, 'Class Code is required'),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD'),
  status: z.enum(ATTENDANCE_STATUSES),
  remarks: z.string().optional().nullable(),
});

export const assessmentImportRowSchema = z.object({
  studentIdNumber: z.string().min(1, 'Student ID is required'),
  subjectCode: z.string().min(1, 'Subject Code is required'),
  assessmentDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD'),
  assessmentTitle: z.string().min(1, 'Assessment Title is required'),
  scoreObtained: z.number().min(0, 'Score obtained cannot be negative'),
  maxScore: z.number().positive('Max score must be greater than 0'),
  assessmentType: z.enum(['QUIZ', 'MIDTERM', 'FINAL', 'ASSIGNMENT', 'PROJECT']).default('QUIZ'),
});

export const resolveEngagementFlagSchema = z.object({
  resolutionNotes: z.string().min(3, 'Resolution notes are required'),
});

export const dismissEngagementFlagSchema = z.object({
  dismissalReason: z.string().min(3, 'Dismissal reason is required'),
});

export const updateInterventionTaskSchema = z.object({
  status: z.enum(TASK_STATUSES).optional(),
  notes: z.string().optional().nullable(),
  resolutionReason: z.string().optional().nullable(),
  assignedCoordinatorId: z.string().uuid().optional(),
});

export const approveMessageSchema = z.object({
  approved: z.boolean(),
  editedContent: z.string().optional(),
  rejectionReason: z.string().optional(),
});

export const systemSettingsSchema = z.object({
  appTimezone: z.string().default('Asia/Kolkata'),
  quietHoursStart: z.string().default('21:00'),
  quietHoursEnd: z.string().default('08:00'),
  slaInitialContactMinutes: z.number().int().default(15),
  followUpDelaysDays: z.array(z.number().int()).default([1, 3, 7]),
  maxFollowUpAttempts: z.number().int().default(3),
  hotLeadThreshold: z.number().default(70),
  warmLeadThreshold: z.number().default(40),
  attendanceWarningThresholdPercent: z.number().default(75),
  consecutiveAbsenceLimit: z.number().int().default(3),
  missingAssignmentsLimit: z.number().int().default(3),
});

export const updateLeadSchema = z.object({
  studentName: z.string().min(2).optional(),
  email: z.string().trim().toLowerCase().email().optional(),
  phone: z.string().trim().min(7).optional(),
  courseInterest: z.string().min(1).optional(),
  preferredStartDate: z.string().optional().nullable(),
  preferredCounsellingTime: z.string().optional().nullable(),
  source: z.enum(LEAD_SOURCES).optional(),
  stage: z.enum(LEAD_STAGES).optional(),
  freeTextInterests: z.string().max(1000).optional().nullable(),
  communicationConsent: z.boolean().optional(),
  optedOut: z.boolean().optional(),
  lossReason: z.string().optional().nullable(),
});

export const parentPreferenceSchema = z.object({
  preferredChannel: z.enum(COMMUNICATION_CHANNELS).optional(),
  consentGiven: z.boolean().optional(),
  quietHoursStart: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  quietHoursEnd: z.string().regex(/^\d{2}:\d{2}$/).optional(),
});

export const createMessageSchema = z.object({
  studentId: z.string().min(1, 'Student ID is required'),
  draftContent: z.string().min(3, 'Message content must have at least 3 characters'),
  channel: z.enum(COMMUNICATION_CHANNELS).default('WHATSAPP'),
  summaryId: z.string().optional().nullable(),
});

export const attendanceRecordCreateSchema = z.object({
  studentId: z.string().min(1, 'Student ID is required'),
  classId: z.string().min(1, 'Class ID is required'),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}/, 'Date format YYYY-MM-DD required'),
  status: z.enum(ATTENDANCE_STATUSES),
  remarks: z.string().optional().nullable(),
});

export const n8nWebhookGeneralSchema = z.object({
  workflowName: z.string().optional(),
  eventType: z.string().optional(),
  data: z.any().optional(),
  executionId: z.string().optional(),
});

// Staff Management Schemas
export const createStaffSchema = z.object({
  staffId: z.string().trim().min(2, 'Staff ID must have at least 2 characters'),
  fullName: z.string().trim().min(2, 'Full name must have at least 2 characters'),
  email: z.string().trim().email('Invalid email address').optional().nullable(),
  phone: z.string().trim().min(7, 'Phone must be at least 7 digits').optional().nullable(),
  designation: z.string().trim().optional().nullable(),
  department: z.string().trim().optional().nullable(),
  joiningDate: z.string().optional().nullable(),
  employmentStatus: z.enum(['ACTIVE', 'INACTIVE', 'ON_LEAVE', 'TERMINATED']).default('ACTIVE'),
});

export const updateStaffSchema = z.object({
  fullName: z.string().trim().min(2, 'Full name must have at least 2 characters').optional(),
  email: z.string().trim().email('Invalid email address').optional().nullable(),
  phone: z.string().trim().min(7, 'Phone must be at least 7 digits').optional().nullable(),
  designation: z.string().trim().optional().nullable(),
  department: z.string().trim().optional().nullable(),
  joiningDate: z.string().optional().nullable(),
  employmentStatus: z.enum(['ACTIVE', 'INACTIVE', 'ON_LEAVE', 'TERMINATED']).optional(),
});

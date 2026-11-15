-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('ADMIN', 'ADMISSIONS_COUNSELLOR', 'ACADEMIC_COORDINATOR', 'TEACHER');

-- CreateEnum
CREATE TYPE "LeadStage" AS ENUM ('New', 'Contacted', 'Counselling Booked', 'Attended', 'Application Started', 'Enrolled', 'Lost', 'Nurture');

-- CreateEnum
CREATE TYPE "LeadScoreCategory" AS ENUM ('HOT', 'WARM', 'COLD');

-- CreateEnum
CREATE TYPE "LeadSource" AS ENUM ('WEB_FORM', 'SIMULATED_WHATSAPP', 'INCOMING_CALL', 'REFERRAL', 'CSV_IMPORT', 'EXTERNAL_CAMPAIGN');

-- CreateTable users
CREATE TABLE "users" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL UNIQUE,
    "passwordHash" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'TEACHER',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable audit_logs
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT,
    "userEmail" TEXT,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT,
    "details" JSONB,
    "ipAddress" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "audit_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL
);
CREATE INDEX "audit_logs_entityType_entityId_idx" ON "audit_logs"("entityType", "entityId");
CREATE INDEX "audit_logs_createdAt_idx" ON "audit_logs"("createdAt");

-- CreateTable notification_events
CREATE TABLE "notification_events" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "eventType" TEXT NOT NULL,
    "recipient" TEXT NOT NULL,
    "channel" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable idempotency_records
CREATE TABLE "idempotency_records" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "idempotencyKey" TEXT NOT NULL UNIQUE,
    "endpoint" TEXT NOT NULL,
    "requestHash" TEXT NOT NULL,
    "responseStatus" INTEGER NOT NULL,
    "responseBody" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX "idempotency_records_idempotencyKey_idx" ON "idempotency_records"("idempotencyKey");

-- CreateTable system_settings
CREATE TABLE "system_settings" (
    "key" TEXT NOT NULL PRIMARY KEY,
    "value" TEXT NOT NULL,
    "description" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable counsellors
CREATE TABLE "counsellors" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL UNIQUE,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL UNIQUE,
    "workingHoursStart" TEXT NOT NULL DEFAULT '09:00',
    "workingHoursEnd" TEXT NOT NULL DEFAULT '18:00',
    "isAvailable" BOOLEAN NOT NULL DEFAULT true,
    "maxWorkload" INTEGER NOT NULL DEFAULT 25,
    "currentWorkload" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "counsellors_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE
);

-- CreateTable counsellor_courses
CREATE TABLE "counsellor_courses" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "counsellorId" TEXT NOT NULL,
    "courseName" TEXT NOT NULL,
    CONSTRAINT "counsellor_courses_counsellorId_fkey" FOREIGN KEY ("counsellorId") REFERENCES "counsellors"("id") ON DELETE CASCADE,
    CONSTRAINT "counsellor_courses_unique" UNIQUE ("counsellorId", "courseName")
);

-- CreateTable leads
CREATE TABLE "leads" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "studentName" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "rawEmail" TEXT,
    "rawPhone" TEXT,
    "courseInterest" TEXT NOT NULL,
    "preferredStartDate" TIMESTAMP(3),
    "preferredCounsellingTime" TEXT,
    "source" "LeadSource" NOT NULL DEFAULT 'WEB_FORM',
    "stage" "LeadStage" NOT NULL DEFAULT 'New',
    "score" INTEGER NOT NULL DEFAULT 0,
    "scoreCategory" "LeadScoreCategory" NOT NULL DEFAULT 'COLD',
    "scoreDetails" JSONB,
    "assignedCounsellorId" TEXT,
    "freeTextInterests" TEXT,
    "aiSummary" TEXT,
    "communicationConsent" BOOLEAN NOT NULL DEFAULT false,
    "optedOut" BOOLEAN NOT NULL DEFAULT false,
    "lossReason" TEXT,
    "lastContactedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "leads_assignedCounsellorId_fkey" FOREIGN KEY ("assignedCounsellorId") REFERENCES "counsellors"("id") ON DELETE SET NULL
);
CREATE INDEX "leads_email_idx" ON "leads"("email");
CREATE INDEX "leads_phone_idx" ON "leads"("phone");
CREATE INDEX "leads_stage_idx" ON "leads"("stage");
CREATE INDEX "leads_scoreCategory_idx" ON "leads"("scoreCategory");

-- CreateTable lead_sources
CREATE TABLE "lead_sources" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL UNIQUE,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable lead_score_history
CREATE TABLE "lead_score_history" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "leadId" TEXT NOT NULL,
    "total" INTEGER NOT NULL,
    "category" "LeadScoreCategory" NOT NULL,
    "factors" JSONB NOT NULL,
    "reasons" JSONB NOT NULL,
    "calculatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "lead_score_history_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "leads"("id") ON DELETE CASCADE
);
CREATE INDEX "lead_score_history_leadId_idx" ON "lead_score_history"("leadId");

-- CreateTable lead_assignments
CREATE TABLE "lead_assignments" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "leadId" TEXT NOT NULL,
    "counsellorId" TEXT NOT NULL,
    "assignedBy" TEXT NOT NULL DEFAULT 'SYSTEM_ROUTING',
    "reason" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "lead_assignments_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "leads"("id") ON DELETE CASCADE,
    CONSTRAINT "lead_assignments_counsellorId_fkey" FOREIGN KEY ("counsellorId") REFERENCES "counsellors"("id") ON DELETE CASCADE
);
CREATE INDEX "lead_assignments_leadId_idx" ON "lead_assignments"("leadId");
CREATE INDEX "lead_assignments_counsellorId_idx" ON "lead_assignments"("counsellorId");

-- CreateTable lead_stage_history
CREATE TABLE "lead_stage_history" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "leadId" TEXT NOT NULL,
    "fromStage" "LeadStage" NOT NULL,
    "toStage" "LeadStage" NOT NULL,
    "changedBy" TEXT NOT NULL DEFAULT 'SYSTEM',
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "lead_stage_history_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "leads"("id") ON DELETE CASCADE
);
CREATE INDEX "lead_stage_history_leadId_idx" ON "lead_stage_history"("leadId");

-- CreateTable follow_up_tasks
CREATE TABLE "follow_up_tasks" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "leadId" TEXT NOT NULL,
    "counsellorId" TEXT NOT NULL,
    "attemptNumber" INTEGER NOT NULL DEFAULT 1,
    "dueAt" TIMESTAMP(3) NOT NULL,
    "scheduledAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "notes" TEXT,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "follow_up_tasks_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "leads"("id") ON DELETE CASCADE,
    CONSTRAINT "follow_up_tasks_counsellorId_fkey" FOREIGN KEY ("counsellorId") REFERENCES "counsellors"("id") ON DELETE CASCADE
);
CREATE INDEX "follow_up_tasks_leadId_idx" ON "follow_up_tasks"("leadId");
CREATE INDEX "follow_up_tasks_counsellorId_idx" ON "follow_up_tasks"("counsellorId");
CREATE INDEX "follow_up_tasks_status_dueAt_idx" ON "follow_up_tasks"("status", "dueAt");

-- CreateTable communication_consents
CREATE TABLE "communication_consents" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "leadId" TEXT,
    "studentId" TEXT,
    "guardianId" TEXT,
    "channel" TEXT NOT NULL DEFAULT 'ALL',
    "consentGiven" BOOLEAN NOT NULL DEFAULT false,
    "optedOutAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable communication_logs
CREATE TABLE "communication_logs" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "leadId" TEXT,
    "studentId" TEXT,
    "channel" TEXT NOT NULL,
    "recipient" TEXT NOT NULL,
    "direction" TEXT NOT NULL DEFAULT 'OUTBOUND',
    "content" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'SENT',
    "isSimulated" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "communication_logs_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "leads"("id") ON DELETE SET NULL
);
CREATE INDEX "communication_logs_leadId_idx" ON "communication_logs"("leadId");

-- CreateTable lead_merge_reviews
CREATE TABLE "lead_merge_reviews" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "existingLeadId" TEXT NOT NULL,
    "incomingData" JSONB NOT NULL,
    "matchType" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "reviewedBy" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "lead_merge_reviews_existingLeadId_fkey" FOREIGN KEY ("existingLeadId") REFERENCES "leads"("id") ON DELETE CASCADE
);

-- CreateTable students
CREATE TABLE "students" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "studentIdNumber" TEXT NOT NULL UNIQUE,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL UNIQUE,
    "phone" TEXT,
    "enrollmentStatus" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX "students_studentIdNumber_idx" ON "students"("studentIdNumber");

-- CreateTable courses
CREATE TABLE "courses" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "courseCode" TEXT NOT NULL UNIQUE,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable classes
CREATE TABLE "classes" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "classCode" TEXT NOT NULL UNIQUE,
    "name" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "teacherId" TEXT,
    "schedule" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "classes_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "courses"("id") ON DELETE CASCADE
);

-- CreateTable enrolments
CREATE TABLE "enrolments" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "studentId" TEXT NOT NULL,
    "classId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "enrolledAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "enrolments_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "students"("id") ON DELETE CASCADE,
    CONSTRAINT "enrolments_classId_fkey" FOREIGN KEY ("classId") REFERENCES "classes"("id") ON DELETE CASCADE,
    CONSTRAINT "enrolments_unique" UNIQUE ("studentId", "classId")
);

-- CreateTable guardians
CREATE TABLE "guardians" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "studentId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "relationship" TEXT NOT NULL DEFAULT 'PARENT',
    "email" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "guardians_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "students"("id") ON DELETE CASCADE
);

-- CreateTable guardian_preferences
CREATE TABLE "guardian_preferences" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "guardianId" TEXT NOT NULL UNIQUE,
    "preferredChannel" TEXT NOT NULL DEFAULT 'WHATSAPP',
    "consentGiven" BOOLEAN NOT NULL DEFAULT true,
    "quietHoursStart" TEXT NOT NULL DEFAULT '21:00',
    "quietHoursEnd" TEXT NOT NULL DEFAULT '08:00',
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "guardian_preferences_guardianId_fkey" FOREIGN KEY ("guardianId") REFERENCES "guardians"("id") ON DELETE CASCADE
);

-- CreateTable attendance_records
CREATE TABLE "attendance_records" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "studentId" TEXT NOT NULL,
    "classId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL,
    "remarks" TEXT,
    "batchId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "attendance_records_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "students"("id") ON DELETE CASCADE,
    CONSTRAINT "attendance_records_classId_fkey" FOREIGN KEY ("classId") REFERENCES "classes"("id") ON DELETE CASCADE,
    CONSTRAINT "attendance_records_unique" UNIQUE ("studentId", "classId", "date")
);
CREATE INDEX "attendance_records_studentId_date_idx" ON "attendance_records"("studentId", "date");

-- CreateTable assessment_records
CREATE TABLE "assessment_records" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "studentId" TEXT NOT NULL,
    "subjectCode" TEXT NOT NULL,
    "assessmentDate" TIMESTAMP(3) NOT NULL,
    "assessmentTitle" TEXT NOT NULL,
    "assessmentType" TEXT NOT NULL DEFAULT 'QUIZ',
    "scoreObtained" DOUBLE PRECISION NOT NULL,
    "maxScore" DOUBLE PRECISION NOT NULL,
    "percentage" DOUBLE PRECISION NOT NULL,
    "batchId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "assessment_records_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "students"("id") ON DELETE CASCADE
);
CREATE INDEX "assessment_records_studentId_assessmentDate_idx" ON "assessment_records"("studentId", "assessmentDate");

-- CreateTable assignment_records
CREATE TABLE "assignment_records" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "studentId" TEXT NOT NULL,
    "classId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "dueDate" TIMESTAMP(3) NOT NULL,
    "submittedDate" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'COMPLETED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "assignment_records_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "students"("id") ON DELETE CASCADE,
    CONSTRAINT "assignment_records_classId_fkey" FOREIGN KEY ("classId") REFERENCES "classes"("id") ON DELETE CASCADE
);
CREATE INDEX "assignment_records_studentId_status_idx" ON "assignment_records"("studentId", "status");

-- CreateTable import_batches
CREATE TABLE "import_batches" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "type" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "totalRows" INTEGER NOT NULL DEFAULT 0,
    "validRows" INTEGER NOT NULL DEFAULT 0,
    "rejectedRows" INTEGER NOT NULL DEFAULT 0,
    "duplicateRows" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable import_errors
CREATE TABLE "import_errors" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "batchId" TEXT NOT NULL,
    "rowNumber" INTEGER NOT NULL,
    "rawData" JSONB NOT NULL,
    "errorMessage" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "import_errors_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "import_batches"("id") ON DELETE CASCADE
);
CREATE INDEX "import_errors_batchId_idx" ON "import_errors"("batchId");

-- CreateTable engagement_flags
CREATE TABLE "engagement_flags" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "studentId" TEXT NOT NULL,
    "rule" TEXT NOT NULL,
    "severity" TEXT NOT NULL,
    "evidence" TEXT NOT NULL,
    "observationWindowStart" TIMESTAMP(3) NOT NULL,
    "observationWindowEnd" TIMESTAMP(3) NOT NULL,
    "suggestedAction" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "dismissalReason" TEXT,
    "resolutionNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "engagement_flags_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "students"("id") ON DELETE CASCADE,
    CONSTRAINT "engagement_flags_unique" UNIQUE ("studentId", "rule", "observationWindowStart", "observationWindowEnd")
);
CREATE INDEX "engagement_flags_studentId_status_idx" ON "engagement_flags"("studentId", "status");

-- CreateTable intervention_tasks
CREATE TABLE "intervention_tasks" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "studentId" TEXT NOT NULL,
    "flagId" TEXT,
    "coordinatorId" TEXT NOT NULL,
    "severity" TEXT NOT NULL,
    "evidence" TEXT NOT NULL,
    "recommendedAction" TEXT NOT NULL,
    "dueDate" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "notes" TEXT,
    "resolutionReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "intervention_tasks_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "students"("id") ON DELETE CASCADE,
    CONSTRAINT "intervention_tasks_flagId_fkey" FOREIGN KEY ("flagId") REFERENCES "engagement_flags"("id") ON DELETE SET NULL,
    CONSTRAINT "intervention_tasks_coordinatorId_fkey" FOREIGN KEY ("coordinatorId") REFERENCES "users"("id") ON DELETE CASCADE
);
CREATE INDEX "intervention_tasks_coordinatorId_status_idx" ON "intervention_tasks"("coordinatorId", "status");
CREATE INDEX "intervention_tasks_studentId_idx" ON "intervention_tasks"("studentId");

-- CreateTable weekly_summaries
CREATE TABLE "weekly_summaries" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "studentId" TEXT NOT NULL,
    "isoWeek" TEXT NOT NULL,
    "attendancePercentage" DOUBLE PRECISION NOT NULL,
    "classesAttended" INTEGER NOT NULL,
    "classesMissed" INTEGER NOT NULL,
    "classesExcused" INTEGER NOT NULL,
    "assignmentCompletionRate" DOUBLE PRECISION NOT NULL,
    "assessmentTrend" TEXT NOT NULL,
    "improvementAreas" JSONB NOT NULL,
    "outstandingInterventions" JSONB NOT NULL,
    "nextSteps" TEXT NOT NULL,
    "aiEnhanced" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "weekly_summaries_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "students"("id") ON DELETE CASCADE,
    CONSTRAINT "weekly_summaries_unique" UNIQUE ("studentId", "isoWeek")
);
CREATE INDEX "weekly_summaries_studentId_idx" ON "weekly_summaries"("studentId");

-- CreateTable message_approvals
CREATE TABLE "message_approvals" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "studentId" TEXT NOT NULL,
    "guardianId" TEXT NOT NULL,
    "summaryId" TEXT,
    "channel" TEXT NOT NULL DEFAULT 'WHATSAPP',
    "draftContent" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING_APPROVAL',
    "approverId" TEXT,
    "approvedAt" TIMESTAMP(3),
    "deliveryStatus" TEXT NOT NULL DEFAULT 'SIMULATED',
    "deliveryAttemptCount" INTEGER NOT NULL DEFAULT 0,
    "deliveryError" TEXT,
    "isSimulated" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "message_approvals_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "students"("id") ON DELETE CASCADE,
    CONSTRAINT "message_approvals_guardianId_fkey" FOREIGN KEY ("guardianId") REFERENCES "guardians"("id") ON DELETE CASCADE,
    CONSTRAINT "message_approvals_summaryId_fkey" FOREIGN KEY ("summaryId") REFERENCES "weekly_summaries"("id") ON DELETE SET NULL
);
CREATE INDEX "message_approvals_status_idx" ON "message_approvals"("status");
CREATE INDEX "message_approvals_studentId_idx" ON "message_approvals"("studentId");

# TEAM B Coaching Institute REST API Documentation

## 1. Authentication & Security
- **Base URL**: `http://localhost:4000/api`
- **Session Mechanism**: JWT stored in `httpOnly` secure cookie (`token`) or passed via `Authorization: Bearer <token>` header.
- **Idempotency**: All mutative operations accept header `x-idempotency-key: <string>`. If replayed, returns cached response with header `X-Idempotent-Replay: true`.
- **Standard Error Response**:
  ```json
  {
    "success": false,
    "error": "Error description message",
    "details": []
  }
  ```

---

## 2. Authentication & Admin Endpoints

### POST `/api/auth/login`
Authenticates user and returns JWT token while setting `httpOnly` cookie.
- **Rate Limit**: 15 requests per 15 minutes.
- **Request Body**:
  ```json
  {
    "email": "admin@teamb.edu",
    "password": "AdminPass123!"
  }
  ```
- **Response (200 OK)**:
  ```json
  {
    "success": true,
    "user": {
      "id": "u-admin-01",
      "email": "admin@teamb.edu",
      "name": "Dr. Vikram Sharma",
      "role": "ADMIN"
    },
    "token": "eyJhbGciOiJIUzI1NiIsIn..."
  }
  ```

### GET `/api/auth/me`
Returns current session profile. Requires authentication.

### GET `/api/settings` & PATCH `/api/settings`
View or update platform parameters (quiet hours, SLA, thresholds). Updating requires `ADMIN` role.

### GET `/api/audit-logs`
Returns paginated immutable audit trail. Requires `ADMIN` or `ACADEMIC_COORDINATOR` role.

---

## 3. Project 1: Admissions Module Endpoints

### POST `/api/leads`
Ingests a new lead enquiry from web forms, API, or external campaigns. Performs normalization, duplicate detection, scoring, routing, and schedules SLA follow-up.
- **Request Body**:
  ```json
  {
    "studentName": "Kunal Singhal",
    "email": "kunal.s@example.com",
    "phone": "9822233344",
    "courseInterest": "JEE Advanced FastTrack",
    "preferredStartDate": "2026-11-05T00:00:00.000Z",
    "preferredCounsellingTime": "10:00 AM - 11:30 AM",
    "source": "WEB_FORM",
    "freeTextInterests": "Preparing for IIT Bombay Computer Science.",
    "communicationConsent": true
  }
  ```
- **Response (201 Created)**:
  ```json
  {
    "success": true,
    "lead": {
      "id": "lead-1730000000000-abcd",
      "studentName": "Kunal Singhal",
      "email": "kunal.s@example.com",
      "phone": "+919822233344",
      "score": 90,
      "scoreCategory": "HOT",
      "assignedCounsellorId": "c-priya-01",
      "stage": "New"
    },
    "isDuplicate": false,
    "routing": {
      "counsellorId": "c-priya-01",
      "counsellorName": "Priya Sen",
      "matchedReason": "Matched on course compatibility ('JEE Advanced FastTrack')...",
      "isFallback": false
    }
  }
  ```

### GET `/api/leads`
Lists leads with filtering: `?stage=New&scoreCategory=HOT&search=Kunal`.

### GET `/api/leads/:id`
Returns lead detail with score breakdown, assignment history, stage history, and follow-up tasks.

### POST `/api/leads/check-duplicate`
Checks whether a given email or phone number is already registered in the lead database.
- **Request Body**: `{ "email": "kunal.s@example.com", "phone": "9822233344" }`
- **Response**: `{ "success": true, "isDuplicate": true, "matchType": "EMAIL_MATCH", "lead": { ... } }`

### PATCH `/api/leads/:id`
Updates lead fields (studentName, courseInterest, preferredStartDate, preferredCounsellingTime, freeTextInterests, stage, lossReason, etc.) and automatically recalculates weighted score.

### DELETE `/api/leads/:id`
Deletes a lead from the database and auto-cancels any open follow-up tasks. Restricted to `ADMIN` or `ADMISSIONS_COUNSELLOR`.

### POST `/api/leads/:id/score`
Explicitly recalculates and returns the latest lead score and category breakdown.

### POST `/api/leads/:id/ai-analyze` & GET `/api/leads/:id/intelligence`
Runs AI lead intelligence analysis: evaluates priority (HOT/WARM/COLD), explains score factors, recommends optimal counsellor routing with justification, suggests follow-up channel & timing, and identifies conversion recovery risk.

### GET `/api/leads/recovery` & `/api/leads/recovery/conversion-recovery`
Returns the prioritized list of leads requiring conversion recovery outreach (e.g., lost high-potential candidates, SLA-breached leads, stalled candidates).

### POST `/api/leads/:id/stage`
Advances candidate pipeline stage. Automatically cancels open follow-ups if stage transitions to `Enrolled` or `Lost`.

### POST `/api/leads/:id/ai-draft`
Generates deterministic fallback draft response and lead summary labelled `DRAFT`.

### GET `/api/counsellors` & PATCH `/api/counsellors/:id`
Returns admissions staff roster, active workload, availability status, and allows updating capacity or working hours.

### GET `/api/follow-ups` & POST `/api/follow-ups/:id/complete`
Lists and completes outreach tasks. Checks opt-out rules, respects quiet hours, and schedules next follow-up delay (+1, +3, +7 days) if attempts < 3.

### GET `/api/admissions/analytics`
Returns institutional sales funnel metrics: conversion rate %, source-wise conversion, SLA compliance %, counsellor workloads, and follow-ups due today.

---

## 4. Project 2: Academic & Engagement Endpoints

### GET `/api/students` & GET `/api/students/:id`
Retrieves student directory with calculated attendance percentage, guardian contact, and active at-risk alerts.

### GET `/api/attendance`
Lists attendance history with query filters: `?studentId=...&classId=...&status=...&date=...&limit=100`.

### POST `/api/attendance`
Direct single attendance record creation with duplicate detection and automatic evaluation of at-risk rules.

### GET `/api/attendance/stats`
Returns institutional overall and status-wise attendance statistics.

### POST `/api/imports/attendance` & `/api/attendance/import`
Accepts attendance CSV rows with staging support (`commit: false` for dry-run preview validation).

### GET `/api/at-risk` & GET `/api/engagement/flags`
Returns triggered at-risk flags (3 consecutive absences, <75% attendance in 30 days, assessment decline).

### POST `/api/at-risk/evaluate/:studentId`
On-demand trigger that evaluates all 5 institutional at-risk rules for a given student.

### POST `/api/at-risk/:id/resolve` & `/api/at-risk/:id/dismiss`
Resolves or dismisses at-risk flags with audit notes; auto-resolves linked coordinator tasks.

### GET `/api/tasks` & GET `/api/intervention-tasks`
Lists coordinator intervention tasks with overdue indicators.

### POST `/api/tasks`
Creates a manual coordinator intervention task.

### PATCH `/api/tasks/:id` & PATCH `/api/intervention-tasks/:id`
Updates status, notes, or resolution reason for intervention tasks (48h resolution SLA).

### GET `/api/parents` & GET `/api/parents/:id`
Lists parent/guardian contacts, linked student info, communication channel preferences, and consent verification status.

### PATCH `/api/parents/:id/preferences`
Updates parent communication channel, quiet hours, and explicit consent status.

### GET `/api/communications` & GET `/api/messages`
Lists parent communication queue and history.

### POST `/api/communications` & POST `/api/messages`
Creates a new parent message draft in `PENDING_APPROVAL` status.

### POST `/api/communications/:id/approve` & POST `/api/messages/:id/approve`
Approves and dispatches parent message. Strictly validates guardian consent; rejects if consent is revoked. Dispatches in safe `DEMO MODE` simulation.

### POST `/api/summaries/weekly/generate`
Generates verified weekly student summaries unique on `(studentId, isoWeek)` and queues approval drafts.

### GET `/api/academic/analytics`
Returns institutional attendance percentage `(present+excused)/(held-excused)*100`, class attendance rankings, active alerts count, and parent communication stats.

---

## 5. Consolidated Dashboard Endpoints

### GET `/api/dashboard` & GET `/api/dashboard/overview`
Provides consolidated institutional intelligence combining admissions and academics:
- Admissions: total enquiries, lead score distribution (HOT, WARM, COLD), enrolled count, conversion rate, counsellor performance.
- Academics: total students, overall attendance percentage, at-risk student count, pending intervention tasks, parent communication status.

---

## 6. Automation Webhook Endpoints (n8n Integration)

All inbound webhooks verify the shared secret via `x-n8n-secret` or `x-shared-secret` header.

- `POST /api/webhooks/n8n/lead` — Inbound lead form ingestion webhook.
- `POST /api/webhooks/n8n/counsellor-assignment` — Counsellor routing and assignment notification.
- `POST /api/webhooks/n8n/attendance` — Batch attendance CSV upload webhook.
- `POST /api/webhooks/n8n/at-risk-alert` — Automated at-risk student alert notification.
- `POST /api/webhooks/n8n/coordinator-task` — Automated coordinator task creation.
- `POST /api/webhooks/n8n/weekly-summary` — Trigger weekly summary generation.
- `POST /api/webhooks/n8n/parent-communication` — Approval and dispatch synchronization.
- `POST /api/webhooks/n8n/workflow-error` — Execution failure and diagnostic reporting.
- `POST /api/webhooks/n8n` — General webhook fallback dispatcher.
- `GET & POST /api/automation/runs` — Automation audit run log inspector.

# Master Acceptance Criteria Verification Checklist

This document maps every single requirement specified in the Master Prompt to its exact implementation source file and automated verification test.

---

## 1. Project 1: Admissions Intelligence, Routing & Follow-ups

| Requirement | Implementation File(s) | Verification Test File | Status |
| :--- | :--- | :--- | :---: |
| **Public Enquiry Form & Intake** | `apps/web/src/pages/PublicEnquiry.tsx`<br>`apps/api/src/routes/admissions.ts` | `apps/api/src/test/admissions.test.ts` (TC-ADM-01) | `PASSED` |
| **E.164 Phone & Lowercase Email Normalization** | `packages/shared/src/utils/index.ts`<br>`apps/api/src/services/admissionsService.ts` | `packages/shared/src/utils/index.test.ts`<br>`apps/api/src/test/admissions.test.ts` | `PASSED` |
| **Duplicate Detection (Phone OR Email match)** | `apps/api/src/services/admissionsService.ts` | `apps/api/src/test/admissions.test.ts` (TC-ADM-02, 03) | `PASSED` |
| **Preserve Raw Attribution & Merge Reviews** | `apps/api/src/services/admissionsService.ts`<br>`apps/api/prisma/schema.prisma` | `apps/api/src/test/admissions.test.ts` (TC-ADM-02) | `PASSED` |
| **Deterministic 0-100 Lead Scoring** | `packages/shared/src/utils/index.ts` | `packages/shared/src/utils/index.test.ts`<br>`apps/api/src/test/admissions.test.ts` | `PASSED` |
| **Counsellor Routing Engine** | `apps/api/src/services/admissionsService.ts` | `apps/api/src/test/admissions.test.ts` (TC-ADM-05) | `PASSED` |
| **Fallback Queue for Unsupported Courses** | `apps/api/src/services/admissionsService.ts` | `apps/api/src/test/admissions.test.ts` (TC-ADM-06) | `PASSED` |
| **Pipeline Stage Progression & History** | `apps/api/src/routes/admissions.ts`<br>`apps/web/src/pages/AdmissionsLeads.tsx` | `apps/api/src/test/admissions.test.ts` (TC-ADM-07) | `PASSED` |
| **Auto-Cancel Follow-ups on Enrolled/Lost** | `apps/api/src/routes/admissions.ts` | `apps/api/src/test/admissions.test.ts` (TC-ADM-07) | `PASSED` |
| **15-Minute SLA Initial Contact Task** | `apps/api/src/services/admissionsService.ts` | `apps/api/src/test/admissions.test.ts` (TC-ADM-01) | `PASSED` |
| **Follow-up Cadence (+1, +3, +7 days)** | `apps/api/src/routes/admissions.ts` | `apps/api/src/test/admissions.test.ts` (TC-ADM-09) | `PASSED` |
| **Max 3 Follow-up Outreach Attempts** | `apps/api/src/routes/admissions.ts` | `apps/api/src/test/admissions.test.ts` (TC-ADM-09) | `PASSED` |
| **Opt-Out Protection (Blocks Outreach)** | `apps/api/src/routes/admissions.ts` | `apps/api/src/test/admissions.test.ts` (TC-ADM-08) | `PASSED` |
| **Quiet Hours Protection (21:00 - 08:00)** | `packages/shared/src/utils/index.ts`<br>`apps/api/src/routes/admissions.ts` | `packages/shared/src/utils/index.test.ts` | `PASSED` |
| **AI Draft Generation (Labelled DRAFT)** | `apps/api/src/services/admissionsService.ts`<br>`apps/web/src/pages/AdmissionsLeads.tsx` | `apps/api/src/test/admissions.test.ts` (TC-ADM-10) | `PASSED` |
| **Admissions Analytics from Stored Records** | `apps/api/src/routes/admissions.ts`<br>`apps/web/src/pages/ReportsAnalytics.tsx` | `apps/api/src/test/admissions.test.ts` | `PASSED` |

---

## 2. Project 2: Student Attendance, At-Risk & Parent Outreach

| Requirement | Implementation File(s) | Verification Test File | Status |
| :--- | :--- | :--- | :---: |
| **Core Academic Entities** | `apps/api/prisma/schema.prisma`<br>`apps/api/src/store/seedData.ts` | `apps/api/src/test/academic.test.ts` | `PASSED` |
| **Staged CSV Import Engine** | `apps/api/src/services/academicService.ts`<br>`apps/web/src/pages/AttendanceImport.tsx` | `apps/api/src/test/academic.test.ts` (TC-ACAD-01) | `PASSED` |
| **Row-Numbered Error Reporting** | `apps/api/src/services/academicService.ts` | `apps/api/src/test/academic.test.ts` (TC-ACAD-02) | `PASSED` |
| **Dry-Run Preview Mode** | `apps/api/src/services/academicService.ts` | `apps/api/src/test/academic.test.ts` (TC-ACAD-04) | `PASSED` |
| **Duplicate Row Detection (Batch & DB)** | `apps/api/src/services/academicService.ts` | `apps/api/src/test/academic.test.ts` (TC-ACAD-03) | `PASSED` |
| **Excused Attendance Formula** | `packages/shared/src/utils/index.ts` | `packages/shared/src/utils/index.test.ts`<br>`apps/api/src/test/academic.test.ts` (TC-ACAD-06) | `PASSED` |
| **At-Risk Rule 1: 3 Consecutive Absences** | `apps/api/src/services/academicService.ts` | `apps/api/src/test/academic.test.ts` (TC-ACAD-05) | `PASSED` |
| **At-Risk Rule 2: Below 75% in 30 Days** | `apps/api/src/services/academicService.ts` | `apps/api/src/test/academic.test.ts` | `PASSED` |
| **At-Risk Rule 5: Assessment Score Decline** | `apps/api/src/services/academicService.ts` | `apps/api/src/test/academic.test.ts` | `PASSED` |
| **Coordinator Intervention Task Gating** | `apps/api/src/services/academicService.ts`<br>`apps/web/src/pages/CoordinatorTasks.tsx` | `apps/api/src/test/academic.test.ts` (TC-ACAD-05) | `PASSED` |
| **Resolve & Dismiss Flags with Audit** | `apps/api/src/routes/academic.ts`<br>`apps/web/src/pages/AtRiskEngagement.tsx` | `apps/api/src/test/academic.test.ts` (TC-ACAD-07) | `PASSED` |
| **Reconcile Metrics on Record Correction** | `apps/api/src/services/academicService.ts` | `apps/api/src/test/academic.test.ts` (TC-ACAD-10) | `PASSED` |
| **Weekly Summaries (Verified Records Only)** | `apps/api/src/services/academicService.ts` | `apps/api/src/test/academic.test.ts` (TC-ACAD-08) | `PASSED` |
| **Summary Deduplication (Student + ISO week)** | `apps/api/src/services/academicService.ts` | `apps/api/src/test/academic.test.ts` (TC-ACAD-08) | `PASSED` |
| **Guardian Consent Enforcement** | `apps/api/src/routes/academic.ts`<br>`apps/web/src/pages/ParentCommunications.tsx` | `apps/api/src/test/academic.test.ts` (TC-ACAD-09) | `PASSED` |
| **Staff Authorization & Mock Dispatch** | `apps/api/src/routes/academic.ts` | `apps/api/src/test/academic.test.ts` | `PASSED` |
| **Mandatory SIMULATED Labelling** | `apps/web/src/pages/ParentCommunications.tsx`<br>`apps/web/src/components/layout/Header.tsx` | `apps/web/src/test/App.test.tsx` | `PASSED` |
| **Academic Analytics Reconciled with DB** | `apps/api/src/routes/academic.ts` | `apps/api/src/test/academic.test.ts` | `PASSED` |

---

## 3. Automation, Security & Operational Architecture

| Requirement | Implementation File(s) | Verification Test File | Status |
| :--- | :--- | :--- | :---: |
| **16 Importable n8n Workflows in `/n8n`** | `n8n/workflows/*.json`<br>`n8n/generateWorkflows.ts` | `n8n/validateWorkflows.test.ts` (65/65 checks) | `PASSED` |
| **Zero Committed Secrets or Hardcoded PII** | `n8n/workflows/*.json`<br>`.env.example` | `n8n/validateWorkflows.test.ts` | `PASSED` |
| **Shared Secret Verified Inbound Webhooks** | `apps/api/src/routes/automation.ts` | `apps/api/src/test/integration.test.ts` | `PASSED` |
| **Execution Logging (`/api/automation/runs`)** | `apps/api/src/routes/automation.ts` | `apps/api/src/test/integration.test.ts` | `PASSED` |
| **Argon2/bcrypt Password Hashing** | `apps/api/src/routes/auth.ts`<br>`apps/api/src/store/seedData.ts` | `apps/api/src/test/auth.test.ts` | `PASSED` |
| **httpOnly Cookie JWT Authentication** | `apps/api/src/routes/auth.ts`<br>`apps/api/src/middleware/auth.ts` | `apps/api/src/test/auth.test.ts` | `PASSED` |
| **Server-Side RBAC Middleware** | `apps/api/src/middleware/auth.ts` | `apps/api/src/test/auth.test.ts` | `PASSED` |
| **Idempotency Key Deduplication Engine** | `apps/api/src/middleware/idempotency.ts` | `apps/api/src/test/auth.test.ts` | `PASSED` |
| **Safe Dev-Only Reset (`reset-dev.ts`)** | `apps/api/prisma/reset-dev.ts` | Verified blocks on `NODE_ENV=production` | `PASSED` |
| **Downloadable Sample CSVs** | `sample-data/*.csv` | File presence verified | `PASSED` |
| **Complete Documentation Deliverables** | `docs/*.md`, `README.md`, `PROGRESS.md` | All 12 documents generated | `PASSED` |

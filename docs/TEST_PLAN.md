# Institutional Test Strategy & Verification Plan

## 1. Overview & Test Objectives
The testing suite for TEAM B Coaching Institute AI Automation Platform verifies full compliance across both operational domains:
- **Project 1 (Admissions)**: Ingestion, normalization, deduplication, deterministic scoring, counsellor routing, SLA follow-up scheduler, opt-out gating, AI drafts, and conversion metrics.
- **Project 2 (Academic)**: CSV import staging, row-numbered validation, attendance formula calculation, 5 at-risk rules, coordinator tasks, weekly summary idempotency, and parent outreach approval.
- **Shared Architecture**: RBAC server-side permissions, idempotency replay headers, audit logging, and n8n webhook integration.

---

## 2. Test Execution Commands

### Run Complete Monorepo Test Suite
```bash
npm run test
```

### Run Package Specific Test Suites
```bash
# Shared library pure calculations & formulas
npm run --workspace=@team-b/shared test

# Backend API integration and services
npm run --workspace=@team-b/api test

# Frontend React Testing Library UI tests
npm run --workspace=@team-b/web test

# n8n Workflow JSON Export Validator (16 workflows)
npx vitest run n8n/validateWorkflows.test.ts
```

---

## 3. Comprehensive Test Case Matrix

### Project 1: Admissions Module Test Cases (10 Cases)
| Case ID | Scenario | Expected Outcome | Verification Status |
| :--- | :--- | :--- | :---: |
| **TC-ADM-01** | Valid Lead Ingestion | Normalizes phone (+91) & email, scores lead, routes counsellor, schedules 15m SLA task | `PASSED` |
| **TC-ADM-02** | Duplicate Phone Match | Detects duplicate on normalized E.164 phone without destroying original source | `PASSED` |
| **TC-ADM-03** | Duplicate Email Match | Detects duplicate on lowercase email, records merge review in database | `PASSED` |
| **TC-ADM-04** | Invalid Email / Phone Input | Rejects invalid email (`not-an-email`) or short phone with 400 validation error | `PASSED` |
| **TC-ADM-05** | Counsellor Capacity Gating | Bypasses unavailable/max-workload counsellors during automatic routing | `PASSED` |
| **TC-ADM-06** | Niche Course Fallback Queue | Places lead in fallback queue (`counsellorId: null`, `isFallback: true`) if course unsupported | `PASSED` |
| **TC-ADM-07** | Pipeline Auto-Cancellation | Transitions lead to `Enrolled`/`Lost` and auto-cancels open follow-up tasks | `PASSED` |
| **TC-ADM-08** | Opt-Out Outreach Protection | Rejects outreach completion for candidates who have opted out (`optedOut: true`) | `PASSED` |
| **TC-ADM-09** | Max Follow-up Attempt Limit | Completes attempt 3 and halts further scheduling (does not schedule attempt 4) | `PASSED` |
| **TC-ADM-10** | Deterministic AI Drafting | Produces draft summary and counsellor reply labelled `DRAFT` requiring approval | `PASSED` |

### Project 2: Academic & Engagement Test Cases (10 Cases)
| Case ID | Scenario | Expected Outcome | Verification Status |
| :--- | :--- | :--- | :---: |
| **TC-ACAD-01** | Attendance CSV Valid Rows | Ingests valid rows, calculates batch stats, and commits records atomically | `PASSED` |
| **TC-ACAD-02** | Unknown Student ID Rejection | Identifies unknown student ID and returns row-numbered error message | `PASSED` |
| **TC-ACAD-03** | Duplicate Row Detection | Detects duplicate student+date row in CSV batch and rejects with row error | `PASSED` |
| **TC-ACAD-04** | Dry-Run Preview Mode | Validates CSV syntax and rows without committing records to persistent store | `PASSED` |
| **TC-ACAD-05** | Consecutive Absences Rule | Detects 3 consecutive absences and raises explainable HIGH severity flag | `PASSED` |
| **TC-ACAD-06** | Attendance Formula Check | Computes `(present + excused) / (held - excused) * 100` with realistic records | `PASSED` |
| **TC-ACAD-07** | Flag Resolution & Task Sync | Resolves flag with staff notes and synchronizes linked coordinator task status | `PASSED` |
| **TC-ACAD-08** | Weekly Summary Idempotency | Generates summary from verified records; prevents duplicates on (student, ISO week) | `PASSED` |
| **TC-ACAD-09** | Guardian Consent Revocation | Blocks parent message authorization if guardian communication consent is revoked | `PASSED` |
| **TC-ACAD-10** | Reconciled Attendance | Correcting attendance breaks consecutive absence sequence and reconciles metrics | `PASSED` |

### Shared & Security Test Cases (5 Cases)
| Case ID | Scenario | Expected Outcome | Verification Status |
| :--- | :--- | :--- | :---: |
| **TC-SEC-01** | Admin Authentication | Sets `httpOnly` cookie and returns user role `ADMIN` | `PASSED` |
| **TC-SEC-02** | Server-Side RBAC Enforcement | Blocks non-admin teacher from updating system settings with 403 Forbidden | `PASSED` |
| **TC-SEC-03** | Idempotency Key Replay | Header `x-idempotency-key` returns cached response with `X-Idempotent-Replay` | `PASSED` |
| **TC-SEC-04** | Inbound Webhook Shared Secret | Validates `x-n8n-secret` header on `/api/webhooks/n8n/*` endpoints | `PASSED` |
| **TC-SEC-05** | n8n 16 Workflows Verification | Verifies 16 valid JSON workflows with zero credentials and active error branches | `PASSED` |

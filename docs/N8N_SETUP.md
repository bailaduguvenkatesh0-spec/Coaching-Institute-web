# n8n Automation Setup & Workflow Import Guide

## Overview
TEAM B Coaching Institute AI Automation Platform utilizes **n8n** for event orchestration across 16 modular pipelines (9 Admissions workflows + 7 Academic workflows).

Workflows are located in `/n8n/workflows/` as importable JSON definitions with all production credentials removed.

---

## Prerequisites & Architecture
- **Docker Compose Mode (Recommended)**: Runs n8n on `http://localhost:5678` alongside PostgreSQL and the API.
- **Local Fallback Mode (No Docker)**: Can run standalone via `npx n8n`.
- **Shared Secret Verification**: All webhook calls to the API (`http://localhost:4000/api/webhooks/n8n/*`) require the header:
  ```http
  x-n8n-secret: <N8N_SHARED_WEBHOOK_SECRET>
  ```

---

## 1. Starting n8n

### Option A: Using Docker Compose
```bash
docker compose up -d n8n
```
n8n will be accessible at: `http://localhost:5678`.

### Option B: Local Fallback (npx)
```bash
npx n8n
```

---

## 2. Importing the 16 Workflows

1. Open n8n web interface at `http://localhost:5678`.
2. In the left navigation, click **Workflows** -> **Import from File**.
3. Select any or all 16 JSON files located in `./n8n/workflows/`:
   - `01_lead_form_ingestion.json` (Project 1: Lead Ingestion & Normalization)
   - `02_external_channel_simulation.json` (Project 1: Simulated Inbound Events)
   - `03_validation_and_deduplication.json` (Project 1: Phone/Email Duplicate Detection)
   - `04_lead_scoring_and_counsellor_routing.json` (Project 1: Scoring & Counsellor Routing)
   - `05_followup_scheduling.json` (Project 1: 15m SLA & Cadence Scheduling)
   - `06_sla_breach_alerts.json` (Project 1: Overdue Lead SLA Monitor)
   - `07_ai_draft_generation.json` (Project 1: DRAFT Lead Notes & Replies)
   - `08_approved_communication_dispatch.json` (Project 1: Mock Dispatch & Opt-out Check)
   - `09_daily_counsellor_task_digest.json` (Project 1: Morning Follow-up Digest)
   - `10_attendance_csv_import.json` (Project 2: CSV Validation & Staged Import)
   - `11_assessment_csv_import.json` (Project 2: Assessment Benchmarking)
   - `12_attendance_and_engagement_evaluation.json` (Project 2: 5 At-Risk Rules Engine)
   - `13_coordinator_task_creation.json` (Project 2: Intervention Task Dispatch)
   - `14_weekly_summary_generation.json` (Project 2: Weekly Summary Idempotent Generator)
   - `15_parent_message_approval_and_dispatch.json` (Project 2: Gated Parent Dispatch)
   - `16_import_error_reporting_and_recovery.json` (Project 2: Row Error Diagnosis)

4. Click **Save** and toggle the workflow switch to **Active**.

---

## 3. Configuring Environment Variables in n8n

Ensure the following variables are set in your n8n environment (or via `docker-compose.yml`):
```env
N8N_SHARED_WEBHOOK_SECRET=teamb-n8n-shared-secret-demo
API_BASE_URL=http://api:4000
GENERIC_TIMEZONE=Asia/Kolkata
```

---

## 4. End-to-End Testing Proof

You can test webhook delivery directly from curl or the test suite:

### Test Lead Ingestion Webhook (Workflow 01)
```bash
curl -X POST http://localhost:4000/api/webhooks/n8n/lead \
  -H "Content-Type: application/json" \
  -H "x-n8n-secret: teamb-n8n-shared-secret-demo" \
  -d '{
    "studentName": "Rohan Deshmukh",
    "email": "rohan.d@example.com",
    "phone": "9812345678",
    "courseInterest": "JEE Advanced FastTrack",
    "communicationConsent": true
  }'
```

### Test Attendance CSV Webhook (Workflow 10)
```bash
curl -X POST http://localhost:4000/api/webhooks/n8n/attendance \
  -H "Content-Type: application/json" \
  -H "x-n8n-secret: teamb-n8n-shared-secret-demo" \
  -d '{
    "fileName": "batch_oct25.csv",
    "rows": [
      {
        "studentIdNumber": "TB-2026-001",
        "classCode": "BATCH-JEE-A",
        "date": "2026-10-25",
        "status": "PRESENT"
      }
    ]
  }'
```

---

## 5. Security & Privacy Safeguards
- **Zero Committed Secrets**: All JSON files reference `$env.N8N_SHARED_WEBHOOK_SECRET` rather than hardcoded credentials.
- **No Unnecessary PII in Execution Logs**: Payloads log IDs and status flags without exposing sensitive personal identifiers in external monitors.
- **Recovery Paths**: Every workflow contains an error branch capturing failures and posting diagnostics to `/api/automation/runs`.

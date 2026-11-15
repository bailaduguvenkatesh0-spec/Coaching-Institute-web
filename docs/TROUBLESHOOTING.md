# TROUBLESHOOTING GUIDE: TEAM B COACHING INSTITUTE AI AUTOMATION PLATFORM

This guide provides practical diagnoses and resolutions for common issues encountered during setup, development, automation orchestration, and testing.

---

## 1. Environment & Runtime Issues

### Issue 1.1: Docker or Docker Compose is Not Installed or Not Running
- **Symptom:** Running `docker compose up` returns `command not found: docker` or `error during connect: This error may indicate that the docker daemon is not running`.
- **Root Cause:** Host machine lacks a running Docker Desktop or Docker daemon.
- **Resolution (Zero-Docker Fallback Mode):**
  1. The platform is architected to run completely without Docker:
     ```bash
     # Terminal 1: Start Backend API (runs in-memory / local SQLite / Postgres fallback)
     cd apps/api
     npm run dev
     
     # Terminal 2: Start Frontend Web UI
     cd apps/web
     npm run dev
     ```
  2. For n8n without Docker:
     ```bash
     npx n8n
     ```
     n8n will boot on `http://localhost:5678`.

---

### Issue 1.2: Port Conflicts (`4000`, `5173`, `5678`, `5432`)
- **Symptom:** `Error: listen EADDRINUSE: address already in use :::4000`.
- **Resolution:**
  - Find the PID listening on the conflicting port:
    ```powershell
    # Windows PowerShell
    Get-Process -Id (Get-NetTCPConnection -LocalPort 4000).OwningProcess
    Stop-Process -Id <PID> -Force
    ```
    ```bash
    # Linux / macOS
    lsof -i :4000
    kill -9 <PID>
    ```
  - Alternatively, change the port in `.env`:
    ```env
    PORT=4001
    VITE_API_URL=http://localhost:4001
    ```

---

### Issue 1.3: Prisma Cannot Download Engine Binaries (Offline / Sandbox)
- **Symptom:** `prisma generate` fails with `getaddrinfo EAI_AGAIN binaries.prisma.sh` or network timeout.
- **Root Cause:** Sandboxed environments or offline enterprise networks prevent automatic downloading of engine binaries.
- **Resolution:**
  Pre-bundled engine binaries are available in `node_modules/@prisma/engines`. Point Prisma to them via environment variables:
  ```powershell
  # Windows PowerShell
  $env:PRISMA_QUERY_ENGINE_LIBRARY="C:\Users\DELL\Documents\TEAM B Coaching Institute\node_modules\@prisma\engines\query_engine-windows.dll.node"
  $env:PRISMA_SCHEMA_ENGINE_BINARY="C:\Users\DELL\Documents\TEAM B Coaching Institute\node_modules\@prisma\engines\schema-engine-windows.exe"
  npx prisma generate --schema=apps/api/prisma/schema.prisma
  ```

---

## 2. Admissions & Routing Engine Issues

### Issue 2.1: Lead Routed to Fallback Queue Instead of Counsellor
- **Symptom:** A newly created lead has `assignedCounsellorId: null` and assignment note mentions "Routed to Fallback Queue".
- **Diagnosis Checklist:**
  1. **Course Compatibility:** Verify if any active counsellor supports the lead's course interest. If a lead selects `GATE CS` and all counsellors only support `IIT-JEE` or `NEET`, the lead safely routes to the fallback queue.
  2. **Working Hours / Shift:** Counsellors operate on configured shifts (e.g., 09:00 - 18:00). If the lead arrives outside all counsellor shifts, it falls back to the queue.
  3. **Workload Capacity:** Check if all matching counsellors are at `currentWorkload >= maxWorkload` (e.g., 25/25 active leads).
- **Resolution:**
  Navigate to **Counsellors** in the UI, increase `maxWorkload`, add supported courses, or manually re-route from the Fallback queue in **Admissions Leads** drawer.

---

### Issue 2.2: Lead Marked as Duplicate Unexpectedly
- **Symptom:** API returns `duplicate: true` with a duplicate reason like `Matching normalized phone number (+919876543210)`.
- **Root Cause:**
  - Phone numbers are normalized strictly to E.164 (e.g., `9876543210` -> `+919876543210`).
  - Emails are normalized to lowercase trimmed strings (`AARAV@gmail.com` -> `aarav@gmail.com`).
  - If EITHER the phone or the email matches an existing lead, the duplicate engine links the new enquiry to the existing lead to preserve full attribution without polluting the pipeline.
- **Resolution:**
  - Check `lead_merge_reviews` in the database or UI.
  - Review historical enquiries under the lead's detail page. If it is genuinely a distinct student sharing a family phone, staff can perform an unmerge review.

---

### Issue 2.3: Follow-Up Messages Queued During Quiet Hours
- **Symptom:** Automated follow-up task is scheduled for next morning at 08:00 instead of executing immediately.
- **Root Cause:** The business default enforces quiet hours between `21:00` and `08:00` (`Asia/Kolkata`). Any lead ingested during quiet hours will calculate immediate SLA tasks but postpone outbound customer communications until quiet hours expire.
- **Resolution:**
  This is expected system behavior. To test during quiet hours, update `APP_TIMEZONE` in `.env` or adjust quiet hours in **Settings** (`/settings`).

---

## 3. Academic & CSV Import Issues

### Issue 3.1: Attendance CSV Import Has Row-Numbered Validation Errors
- **Symptom:** CSV import status is `FAILED` with errors: `Row 4: Unknown student ID STU-999`, `Row 7: Invalid status 'Late' (must be Present, Absent, or Excused)`.
- **Root Cause:** Strict relational data integrity prevents partial or corrupt attendance imports.
- **Resolution:**
  1. Download the reference template from `/sample-data/sample_attendance_import.csv` or click **Download Sample CSV** on the Attendance Import screen.
  2. Ensure all student IDs exist in the student directory before importing.
  3. Valid attendance statuses are case-insensitive: `Present`, `Absent`, `Excused`.
  4. Fix the flagged rows and re-upload. The engine supports atomic rollback—no partial records are written until the entire batch validates.

---

### Issue 3.2: Parent Outreach Message Approval Shows "Consent Not Granted"
- **Symptom:** Clicking **Approve & Send** on a parent outreach card displays an alert: `Cannot approve outreach: Guardian has opted out of automated WhatsApp communications`.
- **Root Cause:** Hard security and privacy gate: parent messages can never be dispatched without an active guardian consent record (`guardian_preferences.consentGiven = true`).
- **Resolution:**
  Navigate to the student's guardian preferences in the Students Directory and verify consent status before initiating outreach.

---

### Issue 3.3: Metrics Not Reconciling After Correcting Attendance
- **Symptom:** An excused absence was logged to correct a student's record, but their At-Risk flag remains active.
- **Resolution:**
  Open the **At-Risk Engagement** page, locate the flag, and click **Resolve**. Enter the resolution note (e.g., "Medical certificate verified; 2 absences excused"). The system will execute reconciliation and recalculate the 30-day attendance percentage using the formula `(present + excused) / (held - excused) * 100`.

---

## 4. n8n Automation & Webhook Issues

### Issue 4.1: Webhook Returns `401 Unauthorized`
- **Symptom:** n8n HTTP Request node receives `401 Unauthorized` with body `{"error": "Invalid or missing x-n8n-secret header"}`.
- **Root Cause:** The `x-n8n-secret` header in the n8n HTTP Request node does not match the backend's `N8N_WEBHOOK_SECRET` environment variable.
- **Resolution:**
  1. Open `.env` and verify the value of `N8N_WEBHOOK_SECRET` (default: `dev_teamb_n8n_secret_token_2026`).
  2. In n8n, ensure the HTTP Request node includes the header:
     ```
     x-n8n-secret: dev_teamb_n8n_secret_token_2026
     ```

---

### Issue 4.2: Webhook Returns `X-Idempotent-Replay: true`
- **Symptom:** Re-running a webhook in n8n does not generate a new lead ID or trigger new follow-up tasks.
- **Root Cause:** The request included an `x-idempotency-key` that has already been executed. The backend returns the cached response to guarantee idempotency.
- **Resolution:**
  This is expected behavior to prevent duplicate leads. To simulate a distinct event, pass a unique `x-idempotency-key` (e.g., `lead-ingest-uuid-${Date.now()}`).

---

## 5. Security & Reset Scripts

### Issue 5.1: Dev Reset Script Refuses to Execute
- **Symptom:** Running `npm run db:reset-dev` or calling `POST /api/settings/reset-demo-data` fails with `CRITICAL: reset-dev script is strictly disabled when NODE_ENV === 'production'`.
- **Root Cause:** Safety guard prevents accidental wiping of production databases.
- **Resolution:**
  Verify that `NODE_ENV` is set to `development` or `test`:
  ```bash
  export NODE_ENV=development
  npm run db:reset-dev
  ```

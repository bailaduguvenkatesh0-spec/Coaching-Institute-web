# Institutional Presentation & 5–8 Minute Demo Walkthrough Script

**Platform:** TEAM B Coaching Institute AI Automation Platform  
**Presenter:** Antigravity Senior Full-Stack & Automation Architect (Solo Developer)  
**Target Duration:** 5 to 8 Minutes  
**Audience:** Client Leadership & AI Evaluation Panel (Clone AI Labs)

---

## 1. Presentation Outline & Timing Breakdown

| Time Index | Stage | Key Focus | Page / Asset |
| :--- | :--- | :--- | :--- |
| **0:00 - 1:00** | Introduction & Problem Context | Dual challenge: manual admissions leakage + high-stakes student dropouts | Architecture Blueprint |
| **1:00 - 2:30** | Project 1: Admissions Intelligence | Public form ingestion, phone/email dedupe, 0-100 scoring, routing, SLA task | `/enquire` & `/leads` |
| **2:30 - 4:00** | Project 1: AI Drafting & Outreach | Deterministic DRAFT reply, follow-up attempt, quiet hours & opt-out protection | Lead Inspector Drawer |
| **4:00 - 5:30** | Project 2: Attendance Import & Rules | Staged CSV import with row errors, excused formula, 5-rule At-Risk Engine | `/import-attendance` & `/at-risk` |
| **5:30 - 6:45** | Project 2: Gated Parent Dispatch | Weekly summary idempotency, guardian consent check, SIMULATED dispatch | `/parent-messages` |
| **6:45 - 8:00** | Architecture, n8n Engine & Tests | 16 n8n workflows, audit trail, 104 passing tests, summary of completeness | `/automations` & CLI |

---

## 2. Step-by-Step Live Demo Walkthrough

### Part 1: Admissions Lead Intelligence & Counsellor Routing (1:00 - 2:30)
1. **Open Public Enquiry Portal** (`http://localhost:5173/enquire`):
   - Enter student: `Aryan Malhotra`, email `aryan@example.com`, phone `9876543210`.
   - Select course: `JEE Advanced FastTrack`.
   - Select target date within 7 days, check communication consent.
   - Click **Submit Admissions Enquiry**.
   - *Observe the instant diagnostic box*:
     - Phone normalized to E.164: `+919876543210`.
     - Lead Score calculated deterministically: **90 / 100 (HOT)**.
     - Routed automatically to **Priya Sen** based on course compatibility and lowest active workload.
     - Scheduled **15-minute SLA Initial Contact Task**.
2. **Demonstrate Duplicate Detection**:
   - Re-submit the form with phone `98765-43210` (same digits, dashed formatting).
   - Click submit: the system detects the duplicate on E.164 phone without destroying original raw source attribution, updating the existing lead and logging a `LeadMergeReview` record!
3. **Switch to Pipeline & Kanban View** (`/leads`):
   - Toggle between **Table View** and **Pipeline Kanban**.
   - Click on `Siddharth Mukherjee` to view the **Score Breakdown**:
     - Course Completeness (25/25 pts), Start Date Proximity (25/25 pts), Consent (20/20 pts), Counselling Slot (15/15 pts), Stage (5/15 pts).
   - Click **AI Draft Reply**: observe the deterministic fallback response clearly tagged **`[DRAFT - REQUIRES COUNSELLOR APPROVAL]`**.
   - Advance stage to `Enrolled`: note that all open follow-up tasks are automatically cancelled!

---

### Part 2: Attendance CSV Import & Explainable At-Risk Engine (4:00 - 5:30)
1. **Open Attendance CSV Import** (`/import-attendance`):
   - Notice pre-loaded sample payload containing a mix of valid records, unknown student IDs (`TB-UNKNOWN-99`), and duplicate rows.
   - Click **Validate (Dry Run)**:
     - The engine highlights 1 valid record and 2 row-numbered rejections (**Row 4: Unknown Student ID**, **Row 5: Duplicate entry in batch**).
     - Database record count remains completely untouched.
   - Click **Commit Import**: valid records are staged atomically, updating batch statistics and triggering reconciliation.
2. **Inspect At-Risk Engagement Engine** (`/at-risk`):
   - Point out **Rohit Verma** (TB-2026-003): triggered rule `CONSECUTIVE_ABSENCES` with clear evidence: *"Recorded 3 consecutive unexcused absences between 2026-10-22 and 2026-10-24"*.
   - Point out **Kavya Singhania**: triggered rule `LOW_ATTENDANCE_WINDOW` with calculated formula: `(present + excused) / (held - excused) * 100`.
   - Click **Resolve Flag**: input resolution note *"Contacted guardian Suresh Verma; medical leave confirmed"*.
   - Confirm resolution: the flag resolves, and the linked coordinator intervention task automatically marks resolved with synchronized audit history!

---

### Part 3: Gated Parent Communication Queue (5:30 - 6:45)
1. **Open Parent Outreach Queue** (`/parent-messages`):
   - Notice pending draft for **Aadhav Ramanathan** (Father: Ramanathan Swaminathan).
   - Point out prominent **`SIMULATED MOCK`** badge ensuring no live SMS or WhatsApp charges occur in test mode.
   - Click **Preview & Edit**: show how staff can edit wording while maintaining verified academic facts.
   - Click **Authorize & Dispatch**: the message approves, recording the coordinator's name and logging the simulated outcome.
2. **Demonstrate Consent Protection**:
   - For **Ananya Iyer**, guardian Gowri Iyer has revoked consent (`consentGiven: false`).
   - The platform strictly disables dispatch and throws a 400 validation error if unauthorized dispatch is attempted.

---

### Part 4: n8n Workflow Automation & Comprehensive Test Proof (6:45 - 8:00)
1. **Open n8n Automations Tab** (`/automations`):
   - Display the registry of all **16 n8n workflows** (9 Admissions + 7 Academic).
   - Click **Simulate Event** on Workflow 01: observe live execution logging in `/api/automation/runs`.
2. **Show Terminal Verification**:
   - Run `npm run test` in terminal.
   - Demonstrate **104 automated tests passing** across shared algorithms, backend APIs, frontend UI components, and n8n workflow definitions.
3. **Closing Summary**: Both Project 1 and Project 2 are fully operational, tested, documented, and ready for institutional deployment.

# System Architecture Specification

## 1. High-Level Architectural Blueprint
The **TEAM B Coaching Institute AI Automation Platform** is architected as a modular, event-driven monorepo separating client presentation, API services, persistent data layer, and autonomous n8n workflows.

```mermaid
graph TD
    Client[Browser / Evaluator] -->|HTTP / React 18| WebApp[Vite React Frontend :5173]
    PublicEnquirer[Prospective Student] -->|HTTP Form| WebApp
    WebApp -->|REST API with Cookies/Bearer| APIServer[Express API Server :4000]

    subgraph Backend Core
        APIServer --> AuthMiddleware[RBAC & Rate Limiting]
        AuthMiddleware --> IdempotencyHandler[Idempotency Interceptor]
        IdempotencyHandler --> AdmissionsModule[Project 1: Admissions Engine]
        IdempotencyHandler --> AcademicModule[Project 2: Academic & At-Risk Engine]
        IdempotencyHandler --> WebhookRouter[n8n Webhook Router]
    end

    subgraph Data Layer
        AdmissionsModule --> DB[(PostgreSQL 16 / Prisma ORM)]
        AcademicModule --> DB
        APIServer --> AuditLogs[(Audit & Compliance Trail)]
    end

    subgraph Automation Engine
        n8n[n8n Automation Engine :5678] -->|HTTP Webhooks| WebhookRouter
        AdmissionsModule -.->|Scheduled Events| n8n
        AcademicModule -.->|At-Risk Events| n8n
        n8n -->|Shared Secret Verified| APIServer
    end
```

---

## 2. Project 1: Lead Ingestion, Scoring & Counsellor Routing Engine

```mermaid
sequenceDiagram
    autonumber
    actor Student as Prospective Candidate
    participant Form as Public Enquiry Form
    participant API as Ingestion Engine (/api/leads)
    participant Normalizer as E.164 & Email Normalizer
    participant Scorer as Deterministic Lead Scorer
    participant Router as Counsellor Routing Engine
    participant DB as PostgreSQL Database
    participant Scheduler as Follow-up Scheduler

    Student->>Form: Submits Enquiry (Name, Email, Phone, Course, Preferences, Consent)
    Form->>API: POST /api/leads (Payload + Idempotency Key)
    API->>Normalizer: Normalize Email (lowercase) & Phone (E.164 +91)
    Normalizer->>DB: Check Duplicate Phone OR Email
    alt Duplicate Detected
        DB-->>API: Match found (Existing Lead ID)
        API->>DB: Merge preferences, update score, preserve original source
        API-->>Form: Return 201 (isDuplicate: true, merged reason)
    else New Lead
        API->>Scorer: Compute Weighted Score (0-100: Course, Date, Consent, Slot, Stage)
        Scorer-->>API: Score Breakdown (Total, Category HOT/WARM/COLD, Factors)
        API->>Router: Match Counsellor (Course match -> Available Shift -> Workload < Max -> Tie-break)
        alt Counsellor Available
            Router-->>API: Assigned Counsellor ID + Match Reason
            API->>DB: Store Lead & LeadAssignment
            API->>Scheduler: Schedule 15-Minute SLA Initial Contact Task
        else All Counsellors Full or Unavailable
            Router-->>API: Fallback Queue (counsellorId: null)
            API->>DB: Store Lead in Triage Fallback Queue
        end
        API-->>Form: Return 201 Created (Lead details + Routing Diagnostics)
    end
```

---

## 3. Project 2: Attendance CSV Import & At-Risk Engagement Pipeline

```mermaid
sequenceDiagram
    autonumber
    actor Coordinator as Academic Coordinator
    participant UI as Attendance Import UI
    participant Validator as CSV Staging & Validation
    participant Engine as At-Risk Rules Engine
    participant DB as Database
    participant Queue as Parent Communication Queue

    Coordinator->>UI: Uploads Attendance CSV (or dry-run preview)
    UI->>Validator: POST /api/imports/attendance (rows array)
    loop Every Row in CSV
        Validator->>Validator: Check Student ID exists & Date format
        Validator->>Validator: Check Duplicate in Batch & DB
    end
    alt Validation Has Errors
        Validator-->>UI: Return Row-Numbered Rejections & Error Report
    else Valid Records Committed
        Validator->>DB: Store attendance_records & import_batch
        Validator->>Engine: Reconcile Metrics for Affected Students
        Engine->>Engine: Compute (present + excused) / (held - excused) * 100
        Engine->>Engine: Check 5 Rules (3 consecutive absences, <75%, score decline)
        alt Rule Triggered (e.g. 3 Consecutive Absences)
            Engine->>DB: Create EngagementFlag (Evidence, Window, Suggested Action)
            Engine->>DB: Create Coordinator InterventionTask (48h SLA, Deduplicated)
            Engine->>Queue: Generate WeeklySummary & Queue Message Approval Draft
        end
        Engine-->>UI: Return Import Complete + Reconciled At-Risk Counts
    end
```

---

## 4. Parent Messaging Flow Safeguards
To comply with institutional privacy, student welfare, and parental communication policies, parent updates adhere to a mandatory human-in-the-loop pipeline:

1. **Deterministic Summary Generation**: Built strictly from verified attendance and assessment records. Never fabricates missing scores.
2. **Preference & Consent Gate**: Verifies guardian preferred channel (WhatsApp, SMS, Email) and checks `consentGiven === true`. If consent is false, system blocks dispatch.
3. **Quiet Hours Check**: Outreach respects configured quiet hours (default: `21:00 - 08:00 Asia/Kolkata`). Any message approved during quiet hours is queued for morning release.
4. **Authorized Staff Approval**: A human Academic Coordinator or Admin must review the preview and click "Authorize & Dispatch".
5. **Mock Delivery Adapter**: In demo mode, dispatches through a simulated mock adapter tagged **"SIMULATED"** to avoid sending live unauthorized messages to real phone numbers.

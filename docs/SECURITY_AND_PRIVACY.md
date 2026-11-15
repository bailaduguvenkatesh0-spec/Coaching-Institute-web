# Security, Privacy & Compliance Architecture

## 1. Role-Based Access Control (RBAC) Matrix

Server-side permissions are enforced via `requireRole(...)` middleware on all sensitive endpoints. UI hiding alone is never relied upon for security:

| Resource / Endpoint | Admin | Admissions Counsellor | Academic Coordinator | Teacher |
| :--- | :---: | :---: | :---: | :---: |
| **View Leads Pipeline & Details** | ✅ | ✅ | ❌ | ❌ |
| **Advance Lead Stage & Log Outreach** | ✅ | ✅ | ❌ | ❌ |
| **Modify Counsellor Capacity / Shift** | ✅ | ✅ (Own) | ❌ | ❌ |
| **Import Attendance & Assessments** | ✅ | ❌ | ✅ | ✅ |
| **Resolve / Dismiss At-Risk Flags** | ✅ | ❌ | ✅ | ❌ |
| **Manage Coordinator Tasks** | ✅ | ❌ | ✅ | ❌ |
| **Approve Parent Message Dispatch** | ✅ | ❌ | ✅ | ❌ |
| **View Audit Logs & Compliance Trail** | ✅ | ❌ | ✅ | ❌ |
| **Configure System Settings / Timings** | ✅ | ❌ | ❌ | ❌ |
| **Execute Safe Dev Database Reset** | ✅ | ❌ | ❌ | ❌ |

---

## 2. Authentication, Session & Password Security
- **Hashing**: All user credentials are encrypted using `bcrypt` with 10 salt rounds. Plaintext passwords are never stored in the database, cached, or transmitted in logs.
- **Session Tokens**: JWT tokens are signed using SHA-256 (`JWT_SECRET`) with a 7-day expiration.
- **httpOnly Cookies**: Tokens are issued inside `httpOnly; SameSite=Lax; Secure` cookies to prevent client-side JavaScript access and mitigate XSS session hijacking.
- **Rate Limiting**:
  - `loginLimiter`: Maximum 15 login attempts per 15-minute window per IP to prevent brute-force credential stuffing.
  - `apiLimiter`: Maximum 300 requests per 15-minute window per IP to mitigate DoS attempts.

---

## 3. Communication Consent & Opt-Out Gating
In adherence with institutional communication ethics and privacy principles:
- **Mandatory Consent Check**: Before creating parent outreach drafts or completing counsellor outreach, the system validates `communicationConsent === true` or guardian `consentGiven === true`.
- **Opt-Out Blocking**: When a candidate or parent exercises their right to opt-out (`optedOut = true`):
  1. The API strictly blocks any follow-up task completion or message dispatch.
  2. All open follow-up tasks are immediately transitioned to `CANCELLED`.
  3. No further automated reminders or digests will target the opted-out contact.

---

## 4. Quiet Hours Protection
- **Configured Window**: Default quiet hours span **21:00 to 08:00** in the institutional timezone (`Asia/Kolkata`).
- **Outreach Queuing**: Any outbound communication scheduled during quiet hours is held in `QUEUED_QUIET_HOURS` status and released only after 08:00.

---

## 5. Mock Delivery Standard (Safe Demo Mode)
- **Zero Real External SMS/WhatsApp Calls**: The application uses a local simulated delivery adapter (`isSimulated: true`).
- **Mandatory SIMULATED Labelling**: In compliance with Operating Rule 5 & 11, all simulated communications, message cards, and analytics displays prominently feature a visible **`SIMULATED`** or **`MOCK ADAPTER ACTIVE`** indicator.
- **No Production PII**: All records in the database, seed files, and sample CSVs are synthetic and fictional.

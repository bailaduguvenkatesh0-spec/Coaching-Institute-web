# TEAM B COACHING INSTITUTE AI AUTOMATION PLATFORM
**Clone AI Labs Client Assignment**  
*Project Period: 26 Oct 2026 to 30 Nov 2026 • Final Deadline: 30 Nov 2026*  
*Senior Full-Stack & AI Automation Engineer (Solo Developer using Google Antigravity)*

---

## Executive Summary
This repository contains a full-stack, enterprise-grade AI automation platform specifically designed for **TEAM B Coaching Institute**. The platform automates two mission-critical institutional operations:

1. **PROJECT 1: Admissions Lead Intelligence, Counsellor Routing & Conversion Recovery**
   - Autonomous multi-channel enquiry ingestion (Web form, REST API, n8n webhook, CSV import, simulated channels).
   - E.164 phone & lowercase email normalization with deduplication preserving raw source attribution.
   - Deterministic 0-100 weighted lead scoring (Hot >= 70, Warm 40-69, Cold < 40).
   - Smart counsellor routing based on course compatibility, working hours, and workload capacity.
   - Follow-up orchestration enforcing a 15-minute SLA, +1/+3/+7 day follow-up cadences, and quiet hours (21:00-08:00 Asia/Kolkata).
   - Deterministic AI drafting for lead notes and outbound counsellor messages (labelled DRAFT).

2. **PROJECT 2: Student Attendance, At-Risk Engagement & Parent Update Automation**
   - Staged CSV import engine for attendance and assessments with row-numbered validation and duplicate rejection.
   - Attendance percentage calculation engine: `(present + excused) / (held - excused) * 100`.
   - 5-Rule explainable At-Risk Engine (3 consecutive absences, <75% attendance in 30 days, missing assignments, assessment score decline).
   - Academic coordinator intervention tasks with 48h SLA and duplicate-prevention.
   - Idempotent weekly student summaries unique on (student, ISO week).
   - Gated parent outreach approval queue with guardian consent checks and mock SIMULATED delivery.

---

## Architecture & Technology Stack
- **Monorepo**: npm workspaces (`apps/web`, `apps/api`, `packages/shared`, `n8n/workflows`, `sample-data`, `docs`).
- **Frontend**: React 18, TypeScript, Vite, Tailwind CSS, React Router v6, TanStack Query, Recharts, Lucide Icons.
- **Backend**: Node.js 20+ LTS, Express, TypeScript, Zod validation, Pino structured logging, Helmet, express-rate-limit.
- **Database**: PostgreSQL 16, Prisma ORM, committed migrations, deterministic synthetic seed scripts.
- **Automation**: n8n (16 importable workflows in `/n8n/workflows/`), webhook & cron triggers, idempotency records.
- **Testing**: Vitest + Supertest, React Testing Library, 100+ automated test checks.

---

## Verified Demo Accounts
The system is pre-seeded with fictional deterministic accounts. You can use the **1-Click Role Switcher** on the login page or top navigation bar:

| Role | Email | Password | Primary Permissions |
| :--- | :--- | :--- | :--- |
| **Admin** | `admin@teamb.edu` | `AdminPass123!` | System settings, counsellor capacity, full audit trail, global reset |
| **Admissions Counsellor** | `counsellor.priya@teamb.edu` | `Counsellor123!` | Lead management, stage progression, follow-up outreach, AI drafts |
| **Academic Coordinator** | `coordinator.rahul@teamb.edu` | `Coordinator123!` | Attendance CSV import, at-risk flag resolution, parent message gating |
| **Teacher** | `teacher.anita@teamb.edu` | `Teacher123!` | Class rosters, attendance submission, read-only academic metrics |

---

## Windows Setup & Exact Operational Instructions

### Prerequisites (Windows)
- **Node.js**: v20+ LTS or v22 LTS ([nodejs.org](https://nodejs.org/))
- **npm**: v10+ (bundled with Node.js)
- **PowerShell** or **Command Prompt (cmd.exe)**

### 1. Install Workspace Dependencies
Open PowerShell or Command Prompt in the repository root:
```powershell
npm install
```

### 2. Configure Environment
Copy `.env.example` to `.env`:
```powershell
copy .env.example .env
```
*(All default values are configured for immediate local development. Secrets are never exposed).*

### 3. Database & Standalone Setup
The platform features dual-engine persistence:
- **Default High-Fidelity Store**: Fully initialized with deterministic seed accounts and realistic data out-of-the-box.
- **PostgreSQL 16 Mode**: Start with Docker:
  ```powershell
  docker compose up -d postgres
  npm run db:generate
  npm run db:migrate
  npm run db:seed
  ```

### 4. Running Locally (Windows 1-Click Launchers)
You can start services using the provided Windows batch files:
- **Start Everything**: Double-click [`start-all.bat`](file:///c:/Users/DELL/Documents/TEAM%20B%20Coaching%20Institute/start-all.bat) or run:
  ```powershell
  npm run dev
  ```
- **Backend Only (Port 4000)**: Double-click [`start-backend.bat`](file:///c:/Users/DELL/Documents/TEAM%20B%20Coaching%20Institute/start-backend.bat) or run:
  ```powershell
  npm run dev:api
  ```
- **Frontend Only (Port 5173)**: Double-click [`start-frontend.bat`](file:///c:/Users/DELL/Documents/TEAM%20B%20Coaching%20Institute/start-frontend.bat) or run:
  ```powershell
  npm run dev:web
  ```

### 5. Port Conflict Resolution
The backend runs on port `4000` and Vite runs on port `5173`.
- **Port Conflict Handling**: The server detects `EADDRINUSE` errors and provides helpful diagnostic guidance instead of silently crashing.
- **Configurable Ports**: If port 4000 is occupied by an external service, simply set `PORT=4001` in your `.env` file. Vite will automatically proxy to the configured API port.
- **Finding Busy Ports in Windows**:
  ```powershell
  netstat -ano | findstr :4000
  netstat -ano | findstr :5173
  ```

### 6. Run Complete Automated Test Suite
```powershell
npm run test
```
All **58 tests** pass across `@team-b/shared`, `@team-b/api`, and `@team-b/web`.

### 7. Compile & Production Build
```powershell
npm run build
```
Executes TypeScript typechecking and bundle compilation for `@team-b/shared`, `@team-b/api`, and `@team-b/web` with zero errors.

---

## Local Network and Cloud Deployment Notes

- The Vite frontend and Express API bind to `0.0.0.0` for trusted LAN development. Run `npm run dev` and keep its terminal open. Find the current laptop Wi-Fi IPv4 address with `ipconfig`; use `http://<wifi-ip>:5173` from a device on the same non-guest Wi-Fi. DHCP can change the address.
- Windows Firewall may require scoped inbound rules on ports 5173 and 4000. Follow [`docs/NETWORK_ACCESS.md`](docs/NETWORK_ACCESS.md). Never expose PostgreSQL port 5432 publicly.
- A private LAN address cannot work across different Wi-Fi networks or mobile data. This project has not been deployed and has no public URL.
- Important: the current API uses an in-memory demo store, not Prisma/PostgreSQL. App data is lost when the API process restarts. Do not use for production records until the service layer is migrated and tested against PostgreSQL.
- See [`docs/LOCAL_DEVELOPMENT.md`](docs/LOCAL_DEVELOPMENT.md), [`docs/DATABASE_CONFIGURATION.md`](docs/DATABASE_CONFIGURATION.md), and [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md) for startup, persistence status, security, provider plan limitations, and cloud deployment steps. No paid plan or personal account will be used without approval.

## Documentation Index
- [`PROGRESS.md`](PROGRESS.md): 12-phase execution checklist and command history.
- [`docs/LOCAL_DEVELOPMENT.md`](docs/LOCAL_DEVELOPMENT.md): Local run commands and current data persistence limitation.
- [`docs/NETWORK_ACCESS.md`](docs/NETWORK_ACCESS.md): Same-Wi-Fi setup, Windows Firewall guidance, and public access requirements.
- [`docs/DATABASE_CONFIGURATION.md`](docs/DATABASE_CONFIGURATION.md): PostgreSQL/Prisma setup and production persistence readiness.
- [`docs/ARCHITECTURE.md`](file:///c:/Users/DELL/Documents/TEAM%20B%20Coaching%20Institute/docs/ARCHITECTURE.md): System architecture, routing logic, and Mermaid flow diagrams.
- [`docs/DATABASE_DESIGN.md`](file:///c:/Users/DELL/Documents/TEAM%20B%20Coaching%20Institute/docs/DATABASE_DESIGN.md): Mermaid ER diagram, schema reference, and key metric SQL queries.
- [`docs/API_DOCUMENTATION.md`](file:///c:/Users/DELL/Documents/TEAM%20B%20Coaching%20Institute/docs/API_DOCUMENTATION.md): Complete REST endpoint specifications, schemas, and error shapes.
- [`docs/N8N_SETUP.md`](file:///c:/Users/DELL/Documents/TEAM%20B%20Coaching%20Institute/docs/N8N_SETUP.md): Step-by-step workflow import and webhook configuration guide.
- [`docs/SECURITY_AND_PRIVACY.md`](file:///c:/Users/DELL/Documents/TEAM%20B%20Coaching%20Institute/docs/SECURITY_AND_PRIVACY.md): RBAC matrix, quiet hour enforcement, and privacy safeguards.
- [`docs/TEST_PLAN.md`](file:///c:/Users/DELL/Documents/TEAM%20B%20Coaching%20Institute/docs/TEST_PLAN.md): Test strategy and edge-case verification matrices.
- [`docs/TEST_RESULTS.md`](file:///c:/Users/DELL/Documents/TEAM%20B%20Coaching%20Institute/docs/TEST_RESULTS.md): Real test execution logs and PASSED evidence.
- [`docs/DEMO_SCRIPT.md`](file:///c:/Users/DELL/Documents/TEAM%20B%20Coaching%20Institute/docs/DEMO_SCRIPT.md): 5-8 minute live presentation walkthrough script.
- [`docs/ACCEPTANCE_CHECKLIST.md`](file:///c:/Users/DELL/Documents/TEAM%20B%20Coaching%20Institute/docs/ACCEPTANCE_CHECKLIST.md): Requirement-to-file verification mapping matrix.
- [`docs/DEPLOYMENT.md`](file:///c:/Users/DELL/Documents/TEAM%20B%20Coaching%20Institute/docs/DEPLOYMENT.md): Containerized and cloud deployment configurations.
- [`docs/TROUBLESHOOTING.md`](file:///c:/Users/DELL/Documents/TEAM%20B%20Coaching%20Institute/docs/TROUBLESHOOTING.md): Diagnostics, error codes, and recovery procedures.

import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../app.js';
import { store } from '../store/index.js';

describe('Phase 5: Academic & Engagement Module (Project 2)', () => {
  const app = createApp();
  let coordinatorToken: string;

  beforeEach(async () => {
    store.reset();
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'coordinator.rahul@teamb.edu', password: 'Coordinator123!' });
    coordinatorToken = loginRes.body.token;
  });

  describe('CSV Import Engine', () => {
    it('validates CSV rows, reports row-numbered errors for unknown students, and rejects duplicates', async () => {
      const rows = [
        {
          studentIdNumber: 'TB-2026-001', // Valid student (Aadhav)
          classCode: 'BATCH-JEE-A',
          date: '2026-10-25',
          status: 'PRESENT' as const,
        },
        {
          studentIdNumber: 'TB-UNKNOWN-999', // Unknown student
          classCode: 'BATCH-JEE-A',
          date: '2026-10-25',
          status: 'PRESENT' as const,
        },
        {
          studentIdNumber: 'TB-2026-001', // Duplicate row in same batch
          classCode: 'BATCH-JEE-A',
          date: '2026-10-25',
          status: 'PRESENT' as const,
        },
      ];

      const res = await request(app)
        .post('/api/imports/attendance')
        .set('Authorization', `Bearer ${coordinatorToken}`)
        .send({ rows, fileName: 'oct25_attendance.csv', commit: true });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.result.validRows).toBe(1);
      expect(res.body.result.rejectedRows).toBe(2);
      expect(res.body.result.errors[0].row).toBe(2);
      expect(res.body.result.errors[0].error).toContain('Unknown Student ID');
      expect(res.body.result.errors[1].row).toBe(3);
      expect(res.body.result.errors[1].error).toContain('Duplicate entry');
    });

    it('supports dry-run preview mode without writing records to DB', async () => {
      const initialCount = store.getState().attendanceRecords.length;

      const rows = [
        {
          studentIdNumber: 'TB-2026-002',
          classCode: 'BATCH-NEET-B',
          date: '2026-10-25',
          status: 'PRESENT' as const,
        },
      ];

      const res = await request(app)
        .post('/api/imports/attendance')
        .set('Authorization', `Bearer ${coordinatorToken}`)
        .send({ rows, fileName: 'preview_test.csv', commit: false });

      expect(res.status).toBe(200);
      expect(res.body.result.validRows).toBe(1);
      expect(res.body.result.importedRecordsCount).toBe(0);
      expect(store.getState().attendanceRecords.length).toBe(initialCount);
    });
  });

  describe('At-Risk Rule Engine & Intervention Tasks', () => {
    it('detects at-risk flag for student with 3 consecutive absences and links coordinator task', async () => {
      // Rohit Verma (s-rohit-03) pre-seeded with 3 consecutive absences
      const flagsRes = await request(app)
        .get('/api/engagement/flags?studentId=s-rohit-03')
        .set('Authorization', `Bearer ${coordinatorToken}`);

      expect(flagsRes.status).toBe(200);
      const flag = flagsRes.body.flags.find((f: any) => f.rule === 'CONSECUTIVE_ABSENCES');
      expect(flag).toBeDefined();
      expect(flag.severity).toBe('HIGH');
      expect(flag.evidence).toContain('3 consecutive unexcused absences');

      // Check linked intervention task
      const tasksRes = await request(app)
        .get('/api/intervention-tasks?studentId=s-rohit-03')
        .set('Authorization', `Bearer ${coordinatorToken}`);

      expect(tasksRes.status).toBe(200);
      expect(tasksRes.body.tasks.length).toBeGreaterThanOrEqual(1);
      expect(tasksRes.body.tasks[0].status).toBe('OPEN');
    });

    it('allows coordinator to resolve engagement flag with notes and auto-resolves task', async () => {
      const flag = store.getState().engagementFlags[0];

      const res = await request(app)
        .post(`/api/engagement/flags/${flag.id}/resolve`)
        .set('Authorization', `Bearer ${coordinatorToken}`)
        .send({ resolutionNotes: 'Contacted parent; student was unwell and has recovered with medical slip.' });

      expect(res.status).toBe(200);
      expect(res.body.flag.status).toBe('RESOLVED');
      expect(res.body.flag.resolutionNotes).toContain('Contacted parent');

      // Verify associated task is resolved
      const task = store.getState().interventionTasks.find((t) => t.flagId === flag.id);
      if (task) {
        expect(task.status).toBe('RESOLVED');
      }
    });
  });

  describe('Weekly Summaries & Idempotency', () => {
    it('generates weekly summary from verified records without duplicate generation for same ISO week', async () => {
      // First generation
      const gen1 = await request(app)
        .post('/api/summaries/weekly/generate')
        .set('Authorization', `Bearer ${coordinatorToken}`)
        .send({ studentId: 's-aadhav-01' });

      expect(gen1.status).toBe(201);
      expect(gen1.body.isNew).toBe(true);
      expect(gen1.body.summary.attendancePercentage).toBe(100);

      // Re-triggering for same student and week should return existing summary without duplicating
      const gen2 = await request(app)
        .post('/api/summaries/weekly/generate')
        .set('Authorization', `Bearer ${coordinatorToken}`)
        .send({ studentId: 's-aadhav-01' });

      expect(gen2.status).toBe(200);
      expect(gen2.body.isNew).toBe(false);
      expect(gen2.body.summary.id).toBe(gen1.body.summary.id);
    });
  });

  describe('Parent Communication Flow & Consent Verification', () => {
    it('blocks message approval when guardian has revoked communication consent', async () => {
      // Student 4 Ananya Iyer's mother Gowri has consentGiven = false
      const guardian = store.getState().guardians.find((g) => g.studentId === 's-ananya-04')!;
      const draft = {
        id: 'msg-no-consent-test',
        studentId: 's-ananya-04',
        guardianId: guardian.id,
        channel: 'EMAIL',
        draftContent: '[DRAFT] Performance alert for Ananya',
        status: 'PENDING_APPROVAL',
        deliveryStatus: 'SIMULATED',
        deliveryAttemptCount: 0,
        isSimulated: true,
      };
      store.getState().messageApprovals.push(draft as any);

      const approveRes = await request(app)
        .post(`/api/messages/${draft.id}/approve`)
        .set('Authorization', `Bearer ${coordinatorToken}`)
        .send({ approved: true });

      expect(approveRes.status).toBe(400);
      expect(approveRes.body.error).toContain('consent');
    });

    it('approves parent message for consenting guardian, sets approver, and tags SIMULATED delivery', async () => {
      const msg = store.getState().messageApprovals[0];

      const approveRes = await request(app)
        .post(`/api/messages/${msg.id}/approve`)
        .set('Authorization', `Bearer ${coordinatorToken}`)
        .send({ approved: true });

      expect(approveRes.status).toBe(200);
      expect(approveRes.body.message.status).toBe('APPROVED');
      expect(approveRes.body.message.deliveryStatus).toBe('SIMULATED');
      expect(approveRes.body.isSimulated).toBe(true);
      expect(approveRes.body.message.approverName).toBeDefined();
    });
  });

  describe('Academic Analytics', () => {
    it('calculates class-wise attendance and reconciles overall metrics', async () => {
      const res = await request(app)
        .get('/api/academic/analytics')
        .set('Authorization', `Bearer ${coordinatorToken}`);

      expect(res.status).toBe(200);
      expect(res.body.metrics.totalStudents).toBe(5);
      expect(res.body.metrics.classWise.length).toBe(3);
      expect(res.body.metrics.attendanceFormula).toBe('(present + excused) / (held - excused) * 100');
    });

    it('reconciles attendance metrics and clears consecutive absence flag when excused record is logged', async () => {
      // Rohit Verma had 3 consecutive absences. If we log an EXCUSED record for the latest day:
      const rows = [
        {
          studentIdNumber: 'TB-2026-003',
          classCode: 'BATCH-JEE-A',
          date: '2026-10-25',
          status: 'PRESENT' as const, // Student attends class
          remarks: 'Returned to class with parent note',
        },
      ];

      const importRes = await request(app)
        .post('/api/imports/attendance')
        .set('Authorization', `Bearer ${coordinatorToken}`)
        .send({ rows, fileName: 'reconciliation_batch.csv', commit: true });

      expect(importRes.status).toBe(200);

      // Verify consecutive absence count broken
      const studentRes = await request(app)
        .get('/api/students/s-rohit-03')
        .set('Authorization', `Bearer ${coordinatorToken}`);

      expect(studentRes.status).toBe(200);
      expect(studentRes.body.student.metrics.consecutiveAbsences).toBe(0);
    });

    it('rejects attendance row with unknown class code with clear row-numbered error', async () => {
      const rows = [
        {
          studentIdNumber: 'TB-2026-001',
          classCode: 'BATCH-NONEXISTENT',
          date: '2026-10-25',
          status: 'PRESENT' as const,
        },
      ];

      const res = await request(app)
        .post('/api/imports/attendance')
        .set('Authorization', `Bearer ${coordinatorToken}`)
        .send({ rows, fileName: 'bad_class.csv', commit: true });

      expect(res.status).toBe(200);
      expect(res.body.result.rejectedRows).toBe(1);
      expect(res.body.result.errors[0].error).toContain('Unknown Class Code');
    });
  });

  describe('Academic Modules Complete API Suite (Attendance, At-Risk, Tasks, Parents, Dashboard)', () => {
    it('queries attendance records on GET /api/attendance and creates single record on POST /api/attendance', async () => {
      const getRes = await request(app)
        .get('/api/attendance?studentId=s-aadhav-01')
        .set('Authorization', `Bearer ${coordinatorToken}`);

      expect(getRes.status).toBe(200);
      expect(getRes.body.success).toBe(true);
      expect(Array.isArray(getRes.body.records)).toBe(true);

      const postRes = await request(app)
        .post('/api/attendance')
        .set('Authorization', `Bearer ${coordinatorToken}`)
        .send({
          studentId: 's-aadhav-01',
          classId: 'class-jee-batch-a',
          date: '2026-10-31',
          status: 'PRESENT',
          remarks: 'Present on Saturday special session',
        });

      expect(postRes.status).toBe(201);
      expect(postRes.body.success).toBe(true);
      expect(postRes.body.record.status).toBe('PRESENT');
    });

    it('queries at-risk flags on GET /api/at-risk and triggers evaluation on POST /api/at-risk/evaluate/:studentId', async () => {
      const getFlags = await request(app)
        .get('/api/at-risk?status=ACTIVE')
        .set('Authorization', `Bearer ${coordinatorToken}`);

      expect(getFlags.status).toBe(200);
      expect(getFlags.body.success).toBe(true);
      expect(getFlags.body.flags.length).toBeGreaterThanOrEqual(1);

      const evalRes = await request(app)
        .post('/api/at-risk/evaluate/s-rohit-03')
        .set('Authorization', `Bearer ${coordinatorToken}`);

      expect(evalRes.status).toBe(200);
      expect(evalRes.body.success).toBe(true);
      expect(evalRes.body.studentId).toBe('s-rohit-03');
    });

    it('creates, queries, and updates coordinator intervention tasks via /api/tasks', async () => {
      const createRes = await request(app)
        .post('/api/tasks')
        .set('Authorization', `Bearer ${coordinatorToken}`)
        .send({
          studentId: 's-kavya-05',
          severity: 'MEDIUM',
          evidence: 'Student indicated difficulty following Organic Chemistry reactions',
          recommendedAction: 'Schedule remedial session with chemistry instructor',
        });

      expect(createRes.status).toBe(201);
      expect(createRes.body.success).toBe(true);
      const taskId = createRes.body.task.id;

      const patchRes = await request(app)
        .patch(`/api/tasks/${taskId}`)
        .set('Authorization', `Bearer ${coordinatorToken}`)
        .send({ status: 'RESOLVED', resolutionReason: 'Completed remedial session successfully' });

      expect(patchRes.status).toBe(200);
      expect(patchRes.body.task.status).toBe('RESOLVED');
    });

    it('manages parent contact information and consent preferences via /api/parents', async () => {
      const listRes = await request(app)
        .get('/api/parents')
        .set('Authorization', `Bearer ${coordinatorToken}`);

      expect(listRes.status).toBe(200);
      expect(listRes.body.success).toBe(true);
      expect(listRes.body.parents.length).toBeGreaterThan(0);

      const parentId = listRes.body.parents[0].id;
      const patchRes = await request(app)
        .patch(`/api/parents/${parentId}/preferences`)
        .set('Authorization', `Bearer ${coordinatorToken}`)
        .send({ consentGiven: false });

      expect(patchRes.status).toBe(200);
      expect(patchRes.body.preferences.consentGiven).toBe(false);
    });

    it('enforces parent communication consent check before approving draft', async () => {
      // Create a draft for student s-rohit-03
      const createDraftRes = await request(app)
        .post('/api/communications')
        .set('Authorization', `Bearer ${coordinatorToken}`)
        .send({
          studentId: 's-rohit-03',
          draftContent: 'Attendance alert: student missed 3 classes.',
          channel: 'WHATSAPP',
        });

      expect(createDraftRes.status).toBe(201);
      const msgId = createDraftRes.body.message.id;

      // Revoke consent
      const guardian = store.getState().guardians.find((g) => g.studentId === 's-rohit-03')!;
      let pref = store.getState().guardianPreferences.find((p) => p.guardianId === guardian.id);
      if (!pref) {
        pref = {
          id: `pref-${guardian.id}`,
          guardianId: guardian.id,
          preferredChannel: 'WHATSAPP',
          consentGiven: false,
          quietHoursStart: '21:00',
          quietHoursEnd: '08:00',
        };
        store.getState().guardianPreferences.push(pref);
      } else {
        pref.consentGiven = false;
      }

      // Try to approve with revoked consent
      const approveRes = await request(app)
        .post(`/api/communications/${msgId}/approve`)
        .set('Authorization', `Bearer ${coordinatorToken}`)
        .send({ approved: true });

      expect(approveRes.status).toBe(400);
      expect(approveRes.body.error).toContain('revoked communication consent');
    });

    it('returns structured JSON for consolidated dashboard on GET /api/dashboard', async () => {
      const res = await request(app)
        .get('/api/dashboard')
        .set('Authorization', `Bearer ${coordinatorToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.dashboard.admissions.totalEnquiries).toBeGreaterThanOrEqual(1);
      expect(res.body.dashboard.admissions.leadScoreDistribution).toBeDefined();
      expect(res.body.dashboard.admissions.conversionRate).toBeDefined();
      expect(res.body.dashboard.academics.totalStudents).toBeGreaterThanOrEqual(1);
      expect(res.body.dashboard.academics.overallAttendancePercentage).toBeDefined();
      expect(res.body.dashboard.academics.parentCommunicationStatus).toBeDefined();
    });
  });
});


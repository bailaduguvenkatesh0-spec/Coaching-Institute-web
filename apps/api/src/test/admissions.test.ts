import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../app.js';
import { store } from '../store/index.js';

describe('Phase 4: Admissions Module (Project 1)', () => {
  const app = createApp();
  let counsellorToken: string;

  beforeEach(async () => {
    store.reset();
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'counsellor.priya@teamb.edu', password: 'Counsellor123!' });
    counsellorToken = loginRes.body.token;
  });

  describe('Lead Ingestion & Deduplication', () => {
    it('ingests a new lead, normalizes phone/email, calculates score, routes counsellor, and creates SLA task', async () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 7);

      const res = await request(app)
        .post('/api/leads')
        .send({
          studentName: 'Kunal Singhal',
          email: '  Kunal.S@Example.COM ',
          phone: '9822233344',
          courseInterest: 'JEE Advanced FastTrack',
          preferredStartDate: futureDate.toISOString(),
          preferredCounsellingTime: '10:00 AM - 11:30 AM',
          source: 'WEB_FORM',
          freeTextInterests: 'Aiming for top 500 rank in JEE Advanced.',
          communicationConsent: true,
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.isDuplicate).toBe(false);
      expect(res.body.lead.email).toBe('kunal.s@example.com');
      expect(res.body.lead.phone).toBe('+919822233344');
      expect(res.body.lead.score).toBeGreaterThanOrEqual(70);
      expect(res.body.lead.scoreCategory).toBe('HOT');
      expect(res.body.lead.assignedCounsellorId).toBeDefined();

      // Verify SLA Follow-up task created
      const tasksRes = await request(app)
        .get(`/api/follow-ups?leadId=${res.body.lead.id}`)
        .set('Authorization', `Bearer ${counsellorToken}`);

      expect(tasksRes.status).toBe(200);
      expect(tasksRes.body.tasks.length).toBe(1);
      expect(tasksRes.body.tasks[0].notes).toContain('SLA Initial Contact Task');
    });

    it('identifies duplicates on matching phone or email without losing source attribution', async () => {
      // First lead
      await request(app)
        .post('/api/leads')
        .send({
          studentName: 'Aarav Joshi',
          email: 'aarav.j@example.com',
          phone: '+919988776655',
          courseInterest: 'NEET Comprehensive',
          source: 'WEB_FORM',
          communicationConsent: true,
        });

      // Second enquiry with same phone but different formatting
      const dupRes = await request(app)
        .post('/api/leads')
        .send({
          studentName: 'Aarav Joshi (Repeat)',
          email: 'aarav.new@example.com',
          phone: '99887-76655', // Matches normalized phone +919988776655
          courseInterest: 'NEET Comprehensive',
          source: 'SIMULATED_WHATSAPP',
          communicationConsent: true,
        });

      expect(dupRes.status).toBe(201);
      expect(dupRes.body.isDuplicate).toBe(true);
      expect(dupRes.body.duplicateReason).toContain('Phone');

      // Verify merge review was logged
      expect(store.getState().leadMergeReviews.length).toBeGreaterThan(0);
    });
  });

  describe('Counsellor Routing Engine', () => {
    it('does not route leads to unavailable or full counsellors', async () => {
      // Counsellor Neha is unavailable (isAvailable: false, workload: 15/15)
      const res = await request(app)
        .post('/api/leads')
        .send({
          studentName: 'Test Routing Candidate',
          email: 'routing.test@example.com',
          phone: '+919800011122',
          courseInterest: 'NEET Comprehensive',
          source: 'WEB_FORM',
          communicationConsent: true,
        });

      expect(res.status).toBe(201);
      // Neha should NOT be chosen; Priya should be chosen
      expect(res.body.lead.assignedCounsellorId).toBe('c-priya-01');
      expect(res.body.lead.assignedCounsellorId).not.toBe('c-neha-03');
    });
  });

  describe('Pipeline Stage Management & Auto-Cancellation', () => {
    it('cancels pending follow-up tasks when lead transitions to Enrolled or Lost', async () => {
      // Lead 1 has an open follow-up task
      const leadId = 'lead-001-hot';

      const updateRes = await request(app)
        .post(`/api/leads/${leadId}/stage`)
        .set('Authorization', `Bearer ${counsellorToken}`)
        .send({ stage: 'Enrolled', note: 'Paid full admission fee' });

      expect(updateRes.status).toBe(200);
      expect(updateRes.body.lead.stage).toBe('Enrolled');

      // Open follow-up task should now be CANCELLED
      const tasksRes = await request(app)
        .get(`/api/follow-ups?leadId=${leadId}`)
        .set('Authorization', `Bearer ${counsellorToken}`);

      const task = tasksRes.body.tasks.find((t: any) => t.id === 'task-fu-01');
      expect(task.status).toBe('CANCELLED');
    });
  });

  describe('Follow-up Execution & Opt-out Protection', () => {
    it('blocks outreach and follow-up completion for opted-out leads', async () => {
      // lead-004-optout is opted out
      const followUpTask = {
        id: 'task-optout-test',
        leadId: 'lead-004-optout',
        counsellorId: 'c-priya-01',
        attemptNumber: 1,
        dueAt: new Date().toISOString(),
        scheduledAt: new Date().toISOString(),
        status: 'OPEN',
      };
      store.getState().followUpTasks.push(followUpTask as any);

      const completeRes = await request(app)
        .post(`/api/follow-ups/${followUpTask.id}/complete`)
        .set('Authorization', `Bearer ${counsellorToken}`)
        .send({ notes: 'Attempting outreach call' });

      expect(completeRes.status).toBe(400);
      expect(completeRes.body.error).toContain('opted out');
    });

    it('completes follow-up task and schedules next attempt (+1 day)', async () => {
      const activeLead = store.getState().leads.find((l) => l.stage === 'Contacted')!;
      const testTask = {
        id: 'task-active-lead-fu',
        leadId: activeLead.id,
        counsellorId: 'c-priya-01',
        attemptNumber: 1,
        dueAt: new Date().toISOString(),
        scheduledAt: new Date().toISOString(),
        status: 'OPEN',
      };
      store.getState().followUpTasks.push(testTask as any);

      const completeRes = await request(app)
        .post(`/api/follow-ups/${testTask.id}/complete`)
        .set('Authorization', `Bearer ${counsellorToken}`)
        .send({ notes: 'Spoke with candidate. Sent brochure on WhatsApp.' });

      expect(completeRes.status).toBe(200);
      expect(completeRes.body.task.status).toBe('COMPLETED');
      expect(completeRes.body.simulated).toBe(true);

      // Verify next follow-up task was scheduled
      const nextTask = store
        .getState()
        .followUpTasks.find((t) => t.leadId === activeLead.id && t.attemptNumber === 2);
      expect(nextTask).toBeDefined();
      expect(nextTask?.status).toBe('OPEN');
    });
  });

  describe('AI Draft Assistance & Admissions Analytics', () => {
    it('generates deterministic drafts clearly marked as DRAFT requiring approval', async () => {
      const res = await request(app)
        .post('/api/leads/lead-001-hot/ai-draft')
        .set('Authorization', `Bearer ${counsellorToken}`);

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('DRAFT');
      expect(res.body.requiresApproval).toBe(true);
      expect(res.body.summaryDraft).toContain('[DRAFT - AI SUMMARY]');
      expect(res.body.replyDraft).toContain('[DRAFT - REQUIRES COUNSELLOR APPROVAL]');
    });
  });

  describe('Boundary Conditions & Security Restrictions', () => {
    it('rejects lead with invalid email format with 400 validation error', async () => {
      const res = await request(app)
        .post('/api/leads')
        .send({
          studentName: 'Bad Email Candidate',
          email: 'not-an-email',
          phone: '9876543210',
          courseInterest: 'JEE Advanced FastTrack',
          communicationConsent: true,
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toContain('Invalid');
    });

    it('places lead in fallback queue when course has no compatible counsellor', async () => {
      const res = await request(app)
        .post('/api/leads')
        .send({
          studentName: 'Niche Course Candidate',
          email: 'niche.c@example.com',
          phone: '9876543299',
          courseInterest: 'Robotics Olympiad Advanced', // No counsellor supports this
          source: 'WEB_FORM',
          communicationConsent: true,
        });

      expect(res.status).toBe(201);
      expect(res.body.lead.assignedCounsellorId).toBeNull();
      expect(res.body.routing.isFallback).toBe(true);
      expect(res.body.routing.matchedReason).toContain('fallback');
    });

    it('enforces maximum follow-up attempt limit (does not schedule attempt 4)', async () => {
      const activeLead = store.getState().leads.find((l) => l.stage === 'Contacted')!;
      const attempt3Task = {
        id: 'task-attempt-3',
        leadId: activeLead.id,
        counsellorId: 'c-priya-01',
        attemptNumber: 3, // At maximum allowed attempts
        dueAt: new Date().toISOString(),
        scheduledAt: new Date().toISOString(),
        status: 'OPEN',
      };
      store.getState().followUpTasks.push(attempt3Task as any);

      const res = await request(app)
        .post(`/api/follow-ups/${attempt3Task.id}/complete`)
        .set('Authorization', `Bearer ${counsellorToken}`)
        .send({ notes: 'Third and final attempt; candidate did not pick up.' });

      expect(res.status).toBe(200);
      expect(res.body.task.status).toBe('COMPLETED');

      // Attempt 4 should NOT be created
      const attempt4Task = store
        .getState()
        .followUpTasks.find((t) => t.leadId === activeLead.id && t.attemptNumber === 4);
      expect(attempt4Task).toBeUndefined();
    });
  });

  describe('Admissions Module Complete API Suite (CRUD, AI Intelligence, Recovery)', () => {
    it('proactively checks duplicate leads via POST /api/leads/check-duplicate', async () => {
      const existing = store.getState().leads[0];
      const matchRes = await request(app)
        .post('/api/leads/check-duplicate')
        .send({ email: existing.email });

      expect(matchRes.status).toBe(200);
      expect(matchRes.body.success).toBe(true);
      expect(matchRes.body.isDuplicate).toBe(true);
      expect(matchRes.body.matchType).toBe('EMAIL_MATCH');

      const nonMatchRes = await request(app)
        .post('/api/leads/check-duplicate')
        .send({ email: 'completely.unique@example.com' });

      expect(nonMatchRes.status).toBe(200);
      expect(nonMatchRes.body.isDuplicate).toBe(false);
    });

    it('updates lead details via PATCH /api/leads/:id', async () => {
      const lead = store.getState().leads[0];
      const res = await request(app)
        .patch(`/api/leads/${lead.id}`)
        .set('Authorization', `Bearer ${counsellorToken}`)
        .send({
          studentName: 'Aarav Sharma Updated',
          courseInterest: 'NEET UG FastTrack',
          freeTextInterests: 'Wants morning weekend batch only',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.lead.studentName).toBe('Aarav Sharma Updated');
      expect(res.body.lead.courseInterest).toBe('NEET UG FastTrack');
    });

    it('deletes lead via DELETE /api/leads/:id and cancels open follow-up tasks', async () => {
      const lead = store.getState().leads[0];
      const res = await request(app)
        .delete(`/api/leads/${lead.id}`)
        .set('Authorization', `Bearer ${counsellorToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      const check = store.getState().leads.find((l) => l.id === lead.id);
      expect(check).toBeUndefined();
    });

    it('recalculates lead score on POST /api/leads/:id/score', async () => {
      const lead = store.getState().leads[1];
      const res = await request(app)
        .post(`/api/leads/${lead.id}/score`)
        .set('Authorization', `Bearer ${counsellorToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.score).toBeGreaterThanOrEqual(0);
      expect(res.body.scoreCategory).toBeDefined();
    });

    it('generates AI lead intelligence analysis via POST /api/leads/:id/ai-analyze', async () => {
      const lead = store.getState().leads[0];
      const res = await request(app)
        .post(`/api/leads/${lead.id}/ai-analyze`)
        .set('Authorization', `Bearer ${counsellorToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.intelligence.priority).toBeDefined();
      expect(res.body.intelligence.recommendations.counsellor).toBeDefined();
      expect(res.body.intelligence.recommendations.nextAction.talkingPoints.length).toBeGreaterThan(0);
      expect(res.body.intelligence.aiProvider).toContain('DETERMINISTIC_FALLBACK');
    });

    it('retrieves conversion recovery candidates via GET /api/leads/recovery', async () => {
      const res = await request(app)
        .get('/api/leads/recovery')
        .set('Authorization', `Bearer ${counsellorToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.recoveryLeads)).toBe(true);
    });
  });
});


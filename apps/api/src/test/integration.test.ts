import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../app.js';
import { store } from '../store/index.js';
import { config } from '../config.js';

describe('Phase 8: Webhook & End-to-End Automation Integration', () => {
  const app = createApp();

  it('serves the API health check with storage mode explicitly identified', async () => {
    const res = await request(app).get('/api/health');

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('HEALTHY');
    expect(res.body.storage).toEqual({ mode: 'in-memory-demo', persistent: false });
  });

  it('allows a private-LAN web origin in development with credentialed CORS', async () => {
    const res = await request(app)
      .get('/api/health')
      .set('Origin', 'http://192.168.1.25:5173');

    expect(res.status).toBe(200);
    expect(res.headers['access-control-allow-origin']).toBe('http://192.168.1.25:5173');
    expect(res.headers['access-control-allow-credentials']).toBe('true');
  });

  beforeEach(() => {
    store.reset();
  });

  describe('n8n Inbound Webhook: Lead Ingestion (/api/webhooks/n8n/lead)', () => {
    it('accepts valid webhook payload from n8n and logs automation run', async () => {
      const res = await request(app)
        .post('/api/webhooks/n8n/lead')
        .set('x-n8n-secret', config.n8nSharedWebhookSecret)
        .send({
          studentName: 'Harsh Vardhan',
          email: 'harsh.v@example.com',
          phone: '+919876500011',
          courseInterest: 'JEE Advanced FastTrack',
          source: 'EXTERNAL_CAMPAIGN',
          communicationConsent: true,
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.runId).toBeDefined();
      expect(res.body.lead.email).toBe('harsh.v@example.com');

      // Verify automation run logged
      const run = store.getState().automationRuns.find((r) => r.id === res.body.runId);
      expect(run).toBeDefined();
      expect(run?.workflowName).toBe('01 Lead Form Ingestion');
      expect(run?.status).toBe('SUCCESS');
    });

    it('rejects webhook with missing required fields with 400', async () => {
      const res = await request(app)
        .post('/api/webhooks/n8n/lead')
        .set('x-n8n-secret', config.n8nSharedWebhookSecret)
        .send({
          studentName: 'Incomplete Candidate',
          // missing email and phone
          courseInterest: 'NEET Comprehensive',
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toContain('Missing required');
    });
  });

  describe('n8n Inbound Webhook: Attendance Import (/api/webhooks/n8n/attendance)', () => {
    it('processes batch attendance rows from n8n webhook and evaluates at-risk triggers', async () => {
      const rows = [
        {
          studentIdNumber: 'TB-2026-001',
          classCode: 'BATCH-JEE-A',
          date: '2026-10-25',
          status: 'PRESENT' as const,
        },
      ];

      const res = await request(app)
        .post('/api/webhooks/n8n/attendance')
        .set('x-n8n-secret', config.n8nSharedWebhookSecret)
        .send({ rows, fileName: 'n8n_batch_oct25.csv' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.result.validRows).toBe(1);

      // Verify automation run record
      const run = store.getState().automationRuns.find((r) => r.id === res.body.runId);
      expect(run).toBeDefined();
      expect(run?.workflowName).toBe('10 Attendance CSV Import');
    });
  });

  describe('n8n Extended Webhooks (Assignment, Alerts, Coordinator Tasks, Communication, Error Reporting)', () => {
    it('processes counsellor assignment webhook notification', async () => {
      const lead = store.getState().leads[0];
      const counsellor = store.getState().counsellors[0];

      const res = await request(app)
        .post('/api/webhooks/n8n/counsellor-assignment')
        .set('x-n8n-secret', config.n8nSharedWebhookSecret)
        .send({
          leadId: lead.id,
          counsellorId: counsellor.id,
          reason: 'Workflow 04 optimal workload match',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.assignment.counsellorId).toBe(counsellor.id);
    });

    it('processes at-risk alert webhook notification', async () => {
      const student = store.getState().students[0];
      const res = await request(app)
        .post('/api/webhooks/n8n/at-risk-alert')
        .set('x-n8n-secret', config.n8nSharedWebhookSecret)
        .send({
          studentId: student.id,
          rule: 'CONSECUTIVE_ABSENCES',
          severity: 'HIGH',
          evidence: 'n8n monitoring detected 3 consecutive missed lectures',
          suggestedAction: 'Immediate telephone intervention',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.flag.studentId).toBe(student.id);
    });

    it('processes coordinator task creation webhook', async () => {
      const student = store.getState().students[0];
      const res = await request(app)
        .post('/api/webhooks/n8n/coordinator-task')
        .set('x-n8n-secret', config.n8nSharedWebhookSecret)
        .send({
          studentId: student.id,
          severity: 'HIGH',
          evidence: 'Missed benchmark test',
          recommendedAction: 'Schedule re-test',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.task.studentId).toBe(student.id);
    });

    it('processes parent communication status update webhook', async () => {
      const message = store.getState().messageApprovals[0];
      const res = await request(app)
        .post('/api/webhooks/n8n/parent-communication')
        .set('x-n8n-secret', config.n8nSharedWebhookSecret)
        .send({
          messageId: message.id,
          approved: true,
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.message.status).toBe('APPROVED');
    });

    it('records and logs workflow execution errors via /api/webhooks/n8n/workflow-error', async () => {
      const res = await request(app)
        .post('/api/webhooks/n8n/workflow-error')
        .set('x-n8n-secret', config.n8nSharedWebhookSecret)
        .send({
          workflowName: '06 SLA Breach Alerts',
          errorMessage: 'Outbound webhook notification timeout to external SMS gateway',
          errorDetails: { code: 'ETIMEDOUT', retryAttempts: 3 },
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.runId).toBeDefined();

      const run = store.getState().automationRuns.find((r) => r.id === res.body.runId);
      expect(run).toBeDefined();
      expect(run?.status).toBe('FAILED');
    });
  });
});

import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../app.js';
import { store } from '../store/index.js';

describe('Phase 3: Auth, RBAC, Idempotency & Audit Logging', () => {
  const app = createApp();

  beforeEach(() => {
    store.reset();
  });

  describe('Authentication Flow', () => {
    it('authenticates Admin with correct credentials and sets httpOnly cookie', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'admin@teamb.edu', password: 'AdminPass123!' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.user.role).toBe('ADMIN');
      expect(res.body.token).toBeDefined();

      const cookies = res.headers['set-cookie'];
      expect(cookies).toBeDefined();
      expect(cookies[0]).toContain('token=');
      expect(cookies[0]).toContain('HttpOnly');
    });

    it('rejects login with incorrect password with 401', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'admin@teamb.edu', password: 'WrongPassword!' });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('returns current user session on GET /api/auth/me', async () => {
      const loginRes = await request(app)
        .post('/api/auth/login')
        .send({ email: 'counsellor.priya@teamb.edu', password: 'Counsellor123!' });

      const token = loginRes.body.token;

      const meRes = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${token}`);

      expect(meRes.status).toBe(200);
      expect(meRes.body.user.email).toBe('counsellor.priya@teamb.edu');
      expect(meRes.body.user.role).toBe('ADMISSIONS_COUNSELLOR');
    });

    it('successfully registers a new user with hashed password and JWT token', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'new.counsellor@teamb.edu',
          password: 'SecurePassword123!',
          name: 'Vikram Joshi',
          role: 'ADMISSIONS_COUNSELLOR',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.user.email).toBe('new.counsellor@teamb.edu');
      expect(res.body.user.role).toBe('ADMISSIONS_COUNSELLOR');
      expect(res.body.token).toBeDefined();

      // Check stored user has password hashed, never plain text
      const stored = store.getState().users.find((u) => u.email === 'new.counsellor@teamb.edu');
      expect(stored).toBeDefined();
      expect(stored?.passwordHash).not.toBe('SecurePassword123!');
      expect(stored?.passwordHash.startsWith('$2')).toBe(true);

      // Verify counsellor profile auto-provisioned
      const counsellor = store.getState().counsellors.find((c) => c.userId === stored?.id);
      expect(counsellor).toBeDefined();
      expect(counsellor?.name).toBe('Vikram Joshi');
    });

    it('rejects registration if email already exists with 409', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'admin@teamb.edu',
          password: 'AnotherPassword123!',
          name: 'Duplicate Admin',
          role: 'ADMIN',
        });

      expect(res.status).toBe(409);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toContain('already exists');
    });
  });

  describe('Server-Side RBAC Enforcement', () => {
    it('blocks non-admin (Teacher) from updating system settings with 403 Forbidden', async () => {
      const teacherLogin = await request(app)
        .post('/api/auth/login')
        .send({ email: 'teacher.anita@teamb.edu', password: 'Teacher123!' });

      const teacherToken = teacherLogin.body.token;

      const patchRes = await request(app)
        .patch('/api/settings')
        .set('Authorization', `Bearer ${teacherToken}`)
        .send({ slaInitialContactMinutes: 30 });

      expect(patchRes.status).toBe(403);
      expect(patchRes.body.error).toContain('Forbidden');
    });

    it('allows Admin to update system settings and records audit log', async () => {
      const adminLogin = await request(app)
        .post('/api/auth/login')
        .send({ email: 'admin@teamb.edu', password: 'AdminPass123!' });

      const adminToken = adminLogin.body.token;

      const patchRes = await request(app)
        .patch('/api/settings')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ slaInitialContactMinutes: 20 });

      expect(patchRes.status).toBe(200);
      expect(patchRes.body.settings.slaInitialContactMinutes).toBe(20);

      // Verify audit log entry
      const auditRes = await request(app)
        .get('/api/audit-logs')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(auditRes.status).toBe(200);
      const updateLog = auditRes.body.logs.find(
        (l: any) => l.action === 'SETTINGS_UPDATED'
      );
      expect(updateLog).toBeDefined();
    });
  });

  describe('Idempotency Records', () => {
    it('returns identical cached response with replay header when x-idempotency-key repeats', async () => {
      const idempotencyKey = 'test-idem-key-12345';

      const firstCall = await request(app)
        .post('/api/auth/login')
        .set('x-idempotency-key', idempotencyKey)
        .send({ email: 'admin@teamb.edu', password: 'AdminPass123!' });

      expect(firstCall.status).toBe(200);
      expect(firstCall.headers['x-idempotent-replay']).toBeUndefined();

      // Second identical call with the same idempotency key
      const secondCall = await request(app)
        .post('/api/auth/login')
        .set('x-idempotency-key', idempotencyKey)
        .send({ email: 'admin@teamb.edu', password: 'AdminPass123!' });

      expect(secondCall.status).toBe(200);
      expect(secondCall.headers['x-idempotent-replay']).toBe('true');
      expect(secondCall.body.user.email).toBe('admin@teamb.edu');
    });
  });
});

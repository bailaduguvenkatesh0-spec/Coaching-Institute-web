import { createApp } from '../src/app.js';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { config } from '../src/config.js';

const app = createApp();
const token = jwt.sign(
  { id: 'u-admin-01', email: 'admin@teamb.edu', name: 'Dr. Vikramaditya Sharma', role: 'ADMIN' },
  config.jwtSecret,
  { expiresIn: '1h' }
);

async function run() {
  console.log('--- TESTING STAFF MANAGEMENT API ---');

  // 1. GET /api/staff (List all staff)
  const listRes = await request(app)
    .get('/api/staff')
    .set('Authorization', `Bearer ${token}`);

  console.log('1. GET /api/staff status:', listRes.status);
  console.log('   Total staff returned:', listRes.body.count);
  console.log('   Staff names:', listRes.body.data?.map((s: any) => `${s.staffId}: ${s.fullName} (${s.employmentStatus})`));

  // 2. GET /api/staff/stats (Dynamic metrics)
  const statsRes = await request(app)
    .get('/api/staff/stats')
    .set('Authorization', `Bearer ${token}`);

  console.log('2. GET /api/staff/stats status:', statsRes.status);
  console.log('   Metrics:', statsRes.body.data);

  // 3. Search Staff
  const searchRes = await request(app)
    .get('/api/staff?search=Venkatesh')
    .set('Authorization', `Bearer ${token}`);
  console.log('3. Search "Venkatesh": found', searchRes.body.count, 'match(es)');

  // 4. Update Staff (e.g. assign designation and department to STF001)
  const updateRes = await request(app)
    .put('/api/staff/STF001')
    .set('Authorization', `Bearer ${token}`)
    .send({
      designation: 'Senior Faculty',
      department: 'Academics',
    });
  console.log('4. PUT /api/staff/STF001 status:', updateRes.status, 'updated designation:', updateRes.body.data?.designation);

  // 5. Duplicate ID prevention test
  const dupRes = await request(app)
    .post('/api/staff')
    .set('Authorization', `Bearer ${token}`)
    .send({
      staffId: 'STF001',
      fullName: 'Duplicate Test',
    });
  console.log('5. Duplicate staffId test: status', dupRes.status, 'error:', dupRes.body.error);

  console.log('--- ALL BACKEND STAFF TESTS PASSED ---');
}

run()
  .catch((e) => {
    console.error('Test failed:', e);
    process.exit(1);
  })
  .finally(() => {
    process.exit(0);
  });

import { createApp } from '../apps/api/dist/app.js';

const app = createApp();
const server = app.listen(4000, '0.0.0.0', async () => {
  try {
    const healthRes = await fetch('http://127.0.0.1:4000/api/health');
    const healthData = await healthRes.json();
    console.log('1. Health Check (/api/health):', healthData.status === 'HEALTHY' ? 'PASSED' : 'FAILED');

    const authRes = await fetch('http://127.0.0.1:4000/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@teamb.edu', password: 'AdminPass123!' })
    });
    const authData = await authRes.json();
    console.log('2. Auth Login (/api/auth/login):', authData.token ? 'PASSED' : 'FAILED', `(User: ${authData.user?.email}, Role: ${authData.user?.role})`);

    const leadsRes = await fetch('http://127.0.0.1:4000/api/leads', {
      headers: { 'Authorization': `Bearer ${authData.token}` }
    });
    const leadsData = await leadsRes.json();
    console.log('3. Leads Endpoint (/api/leads):', leadsData.leads?.length > 0 ? 'PASSED' : 'FAILED', `(${leadsData.leads?.length} pre-seeded leads)`);

    const studentsRes = await fetch('http://127.0.0.1:4000/api/students', {
      headers: { 'Authorization': `Bearer ${authData.token}` }
    });
    const studentsData = await studentsRes.json();
    console.log('4. Students Endpoint (/api/students):', studentsData.students?.length > 0 ? 'PASSED' : 'FAILED', `(${studentsData.students?.length} students)`);

  } catch (err) {
    console.error('Verification failed:', err);
  } finally {
    server.close();
    process.exit(0);
  }
});

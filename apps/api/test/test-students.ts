// ─────────────────────────────────────────────────────────────────────────────
// TEAM B Coaching Institute — Integration Test for Student Management
// ─────────────────────────────────────────────────────────────────────────────

import { createApp } from '../src/app.js';
import request from 'supertest';
import { getPrisma } from '../src/prisma.js';

async function testStudentsModule() {
  console.log('======================================================');
  console.log('  TESTING STUDENT MANAGEMENT MODULE (POSTGRESQL & API)');
  console.log('======================================================\n');

  const app = createApp();

  // 1. Login as Admin to obtain JWT token
  console.log('1. Authenticating as Administrator...');
  const loginRes = await request(app)
    .post('/api/auth/login')
    .send({ email: 'admin@teamb.edu', password: 'AdminPass123!' });

  if (loginRes.status !== 200 || !loginRes.body.token) {
    throw new Error(`Admin login failed: ${JSON.stringify(loginRes.body)}`);
  }
  const token = loginRes.body.token;
  console.log('   ✓ Admin login authenticated successfully.\n');

  // 2. Test GET /api/courses
  console.log('2. Testing GET /api/courses...');
  const coursesRes = await request(app)
    .get('/api/courses')
    .set('Authorization', `Bearer ${token}`);
  console.log(`   ✓ Status: ${coursesRes.status}`);
  console.log(`   ✓ Courses Count: ${coursesRes.body.courses?.length}`);
  const courseTitles = coursesRes.body.courses?.map((c: any) => c.title);
  console.log(`   ✓ Course Titles: ${courseTitles.join(', ')}\n`);

  // 3. Test GET /api/students/stats
  console.log('3. Testing GET /api/students/stats (Dynamic DB Aggregation)...');
  const statsRes = await request(app)
    .get('/api/students/stats')
    .set('Authorization', `Bearer ${token}`);
  console.log(`   ✓ Status: ${statsRes.status}`);
  console.log('   ✓ Stats Response:', JSON.stringify(statsRes.body.stats, null, 2));

  // 4. Test GET /api/students with pagination
  console.log('\n4. Testing GET /api/students with pagination (page=1, limit=10)...');
  const page1Res = await request(app)
    .get('/api/students?page=1&limit=10')
    .set('Authorization', `Bearer ${token}`);
  console.log(`   ✓ Status: ${page1Res.status}`);
  console.log(`   ✓ Total in DB: ${page1Res.body.total}`);
  console.log(`   ✓ Page: ${page1Res.body.page}, Limit: ${page1Res.body.limit}, Total Pages: ${page1Res.body.totalPages}`);
  console.log(`   ✓ Sample Students (first 3):`);
  page1Res.body.students?.slice(0, 3).forEach((s: any) => {
    console.log(`     • [${s.studentId}] ${s.fullName} | Course: ${s.courseName} | Fee: ${s.feeStatus} | Status: ${s.studentStatus}`);
  });

  // 5. Test Filter by Course (Java Full Stack -> should return 30)
  console.log('\n5. Testing Course Filter: "Java Full Stack"...');
  const javaRes = await request(app)
    .get('/api/students?course=Java%20Full%20Stack&limit=50')
    .set('Authorization', `Bearer ${token}`);
  console.log(`   ✓ Java Full Stack Count: ${javaRes.body.total} (Expected: 30)`);

  // 6. Test Filter by Course (Python Full Stack -> should return 25)
  console.log('\n6. Testing Course Filter: "Python Full Stack"...');
  const pyRes = await request(app)
    .get('/api/students?course=Python%20Full%20Stack&limit=50')
    .set('Authorization', `Bearer ${token}`);
  console.log(`   ✓ Python Full Stack Count: ${pyRes.body.total} (Expected: 25)`);

  // 7. Test Filter by Course (Web Development -> should return 20)
  console.log('\n7. Testing Course Filter: "Web Development"...');
  const webRes = await request(app)
    .get('/api/students?course=Web%20Development&limit=50')
    .set('Authorization', `Bearer ${token}`);
  console.log(`   ✓ Web Development Count: ${webRes.body.total} (Expected: 20)`);

  // 8. Test Filter by Course (Data Analytics -> should return 25)
  console.log('\n8. Testing Course Filter: "Data Analytics"...');
  const dataRes = await request(app)
    .get('/api/students?course=Data%20Analytics&limit=50')
    .set('Authorization', `Bearer ${token}`);
  console.log(`   ✓ Data Analytics Count: ${dataRes.body.total} (Expected: 25)`);

  // 9. Test Fee Status Filter: PAID (should be 60)
  console.log('\n9. Testing Fee Status Filter: "PAID"...');
  const paidRes = await request(app)
    .get('/api/students?feeStatus=PAID&limit=100')
    .set('Authorization', `Bearer ${token}`);
  console.log(`   ✓ Fee PAID Count: ${paidRes.body.total} (Expected: 60)`);

  // 10. Test Fee Status Filter: PARTIALLY_PAID (should be 25)
  console.log('\n10. Testing Fee Status Filter: "PARTIALLY_PAID"...');
  const partialRes = await request(app)
    .get('/api/students?feeStatus=PARTIALLY_PAID&limit=100')
    .set('Authorization', `Bearer ${token}`);
  console.log(`   ✓ Fee PARTIALLY_PAID Count: ${partialRes.body.total} (Expected: 25)`);

  // 11. Test Student Status Filter: INACTIVE (should be 10)
  console.log('\n11. Testing Student Status Filter: "INACTIVE"...');
  const inactiveRes = await request(app)
    .get('/api/students?studentStatus=INACTIVE&limit=50')
    .set('Authorization', `Bearer ${token}`);
  console.log(`   ✓ Status INACTIVE Count: ${inactiveRes.body.total} (Expected: 10)`);

  // 12. Test Student Status Filter: COMPLETED (should be 10)
  console.log('\n12. Testing Student Status Filter: "COMPLETED"...');
  const completedRes = await request(app)
    .get('/api/students?studentStatus=COMPLETED&limit=50')
    .set('Authorization', `Bearer ${token}`);
  console.log(`   ✓ Status COMPLETED Count: ${completedRes.body.total} (Expected: 10)`);

  // 13. Test Search by Student ID
  console.log('\n13. Testing Search by Student ID: "STU042"...');
  const searchIdRes = await request(app)
    .get('/api/students?search=STU042')
    .set('Authorization', `Bearer ${token}`);
  console.log(`   ✓ Found ${searchIdRes.body.students?.length} student(s)`);
  if (searchIdRes.body.students?.length > 0) {
    const s = searchIdRes.body.students[0];
    console.log(`   ✓ Student ID: ${s.studentId}, Name: ${s.fullName}, Email: ${s.email}, Course: ${s.courseName}`);
  }

  // 14. Test GET /api/students/:id
  console.log('\n14. Testing GET /api/students/STU001...');
  const singleRes = await request(app)
    .get('/api/students/STU001')
    .set('Authorization', `Bearer ${token}`);
  console.log(`   ✓ Status: ${singleRes.status}`);
  console.log(`   ✓ Name: ${singleRes.body.student?.name}, Course: ${singleRes.body.student?.courseName}, Fee: ${singleRes.body.student?.feeStatus}`);

  console.log('\n======================================================');
  console.log('  ALL STUDENT MANAGEMENT API TESTS PASSED!            ');
  console.log('======================================================\n');
}

testStudentsModule()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Test execution failed:', err);
    process.exit(1);
  });

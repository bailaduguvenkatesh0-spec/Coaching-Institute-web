import { getPrisma } from '../apps/api/src/prisma.js';

async function main() {
  const p = getPrisma();
  if (!p) {
    console.log('Prisma not available');
    return;
  }

  const [
    leadsCount,
    studentsCount,
    coursesCount,
    classesCount,
    enrolmentsCount,
    attendanceCount,
    flagsCount,
    tasksCount,
    staffCount,
    usersCount,
  ] = await Promise.all([
    p.lead.count(),
    p.student.count(),
    p.course.count(),
    p.class.count(),
    p.enrolment.count(),
    p.attendanceRecord.count(),
    p.engagementFlag.count(),
    p.interventionTask.count(),
    p.staff.count(),
    p.user.count(),
  ]);

  console.log('=== DATABASE RECORD COUNTS ===');
  console.log(`Leads:              ${leadsCount}`);
  console.log(`Students:           ${studentsCount}`);
  console.log(`Courses:            ${coursesCount}`);
  console.log(`Classes:            ${classesCount}`);
  console.log(`Enrolments:         ${enrolmentsCount}`);
  console.log(`Attendance Records: ${attendanceCount}`);
  console.log(`Engagement Flags:   ${flagsCount}`);
  console.log(`Intervention Tasks: ${tasksCount}`);
  console.log(`Staff Members:      ${staffCount}`);
  console.log(`Users:              ${usersCount}`);

  // Inspect sample leads
  const leads = await p.lead.findMany({ take: 5 });
  console.log('\nSample Leads:', leads.map((l) => ({ id: l.id, name: l.studentName, stage: l.stage, score: l.score })));

  // Inspect leads by stage
  const stages = await p.lead.groupBy({
    by: ['stage'],
    _count: { id: true },
  });
  console.log('\nLeads by Stage:', stages);

  // Inspect classes
  const classes = await p.class.findMany({ include: { course: true } });
  console.log('\nClasses:', classes.map(c => ({ id: c.id, code: c.classCode, name: c.name, course: c.course.title })));

  // Inspect attendance records
  const att = await p.attendanceRecord.findMany({ take: 5 });
  console.log('\nSample Attendance Records:', att);
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });

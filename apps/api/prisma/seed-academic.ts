// ─────────────────────────────────────────────────────────────────────────────
// TEAM B Coaching Institute — Seed Classes, Enrolments, Attendance & Flags
// Populates PostgreSQL with real academic batches and attendance history.
// ─────────────────────────────────────────────────────────────────────────────

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function seedAcademicData() {
  console.log('======================================================');
  console.log('  SEEDING ACADEMIC CLASSES & ATTENDANCE RECORDS       ');
  console.log('======================================================\n');

  // 1. Ensure Classes exist for each course
  console.log('Step 1: Upserting Academic Batches / Classes...');
  const classesToSeed = [
    {
      id: 'class-jee-batch-a',
      classCode: 'BATCH-JEE-A',
      name: 'JEE Alpha Batch (Morning)',
      courseId: 'course-jee-01',
      schedule: 'Mon-Wed-Fri 08:00 - 11:00',
    },
    {
      id: 'class-neet-batch-b',
      classCode: 'BATCH-NEET-B',
      name: 'NEET Pinnacle Batch',
      courseId: 'course-neet-02',
      schedule: 'Tue-Thu-Sat 09:00 - 12:00',
    },
    {
      id: 'class-fnd-batch-c',
      classCode: 'BATCH-FND-C',
      name: 'Foundation Achievers',
      courseId: 'course-fnd-03',
      schedule: 'Mon-Wed-Fri 16:00 - 18:00',
    },
    {
      id: 'class-java-batch-d',
      classCode: 'BATCH-JAVA-A',
      name: 'Java Full Stack Morning Batch',
      courseId: 'course-java-fs',
      schedule: 'Mon-Fri 09:00 - 12:00',
    },
    {
      id: 'class-py-batch-e',
      classCode: 'BATCH-PY-B',
      name: 'Python Full Stack Evening Batch',
      courseId: 'course-py-fs',
      schedule: 'Mon-Fri 17:00 - 20:00',
    },
    {
      id: 'class-web-batch-f',
      classCode: 'BATCH-WEB-C',
      name: 'Web Development Weekend Batch',
      courseId: 'course-web-dev',
      schedule: 'Sat-Sun 10:00 - 16:00',
    },
    {
      id: 'class-data-batch-g',
      classCode: 'BATCH-DATA-D',
      name: 'Data Analytics FastTrack Batch',
      courseId: 'course-data-analytics',
      schedule: 'Mon-Thu 14:00 - 17:00',
    },
  ];

  for (const cls of classesToSeed) {
    await prisma.class.upsert({
      where: { classCode: cls.classCode },
      update: { name: cls.name, courseId: cls.courseId, schedule: cls.schedule },
      create: cls,
    });
    console.log(`  ✓ Class: ${cls.name} (${cls.classCode})`);
  }

  // 2. Enrol Students into Classes
  console.log('\nStep 2: Enrolling Students into Classes...');
  // Enrol the 5 foundation/JEE students
  const baselineEnrolments = [
    { studentId: 's-aadhav-01', classId: 'class-jee-batch-a' },
    { studentId: 's-diya-02', classId: 'class-neet-batch-b' },
    { studentId: 's-rohit-03', classId: 'class-jee-batch-a' },
    { studentId: 's-ananya-04', classId: 'class-jee-batch-a' },
    { studentId: 's-kavya-05', classId: 'class-fnd-batch-c' },
  ];

  for (const e of baselineEnrolments) {
    await prisma.enrolment.upsert({
      where: { studentId_classId: { studentId: e.studentId, classId: e.classId } },
      update: { status: 'ACTIVE' },
      create: {
        id: `enr-${e.studentId}`,
        studentId: e.studentId,
        classId: e.classId,
        status: 'ACTIVE',
      },
    });
  }

  // Enrol sample demo students into technical classes
  const demoStudents = await prisma.student.findMany({
    where: { isDemoData: true },
    take: 40,
  });

  for (let i = 0; i < demoStudents.length; i++) {
    const s = demoStudents[i];
    let classId = 'class-java-batch-d';
    if (s.courseId === 'course-py-fs') classId = 'class-py-batch-e';
    else if (s.courseId === 'course-web-dev') classId = 'class-web-batch-f';
    else if (s.courseId === 'course-data-analytics') classId = 'class-data-batch-g';

    await prisma.enrolment.upsert({
      where: { studentId_classId: { studentId: s.id, classId } },
      update: { status: 'ACTIVE' },
      create: {
        id: `enr-${s.id}`,
        studentId: s.id,
        classId,
        status: 'ACTIVE',
      },
    });
  }
  console.log(`  ✓ Enrolled 45 students across 7 batches.`);

  // 3. Seed Attendance Records for the last 10 session days
  console.log('\nStep 3: Seeding Attendance Records into PostgreSQL...');
  const sessionDates = [
    '2026-10-15',
    '2026-10-16',
    '2026-10-17',
    '2026-10-18',
    '2026-10-19',
    '2026-10-20',
    '2026-10-21',
    '2026-10-22',
    '2026-10-23',
    '2026-10-24',
  ];

  let attInserted = 0;

  // Student 1 (Aadhav): 100% Present
  for (const d of sessionDates) {
    const recordDate = new Date(`${d}T09:00:00.000Z`);
    await prisma.attendanceRecord.upsert({
      where: {
        studentId_classId_date: {
          studentId: 's-aadhav-01',
          classId: 'class-jee-batch-a',
          date: recordDate,
        },
      },
      update: { status: 'PRESENT', remarks: 'On time' },
      create: {
        id: `att-aadhav-${d}`,
        studentId: 's-aadhav-01',
        classId: 'class-jee-batch-a',
        date: recordDate,
        status: 'PRESENT',
        remarks: 'On time',
      },
    });
    attInserted++;
  }

  // Student 2 (Diya): 90% Present (1 Excused)
  for (let i = 0; i < sessionDates.length; i++) {
    const d = sessionDates[i];
    const recordDate = new Date(`${d}T09:00:00.000Z`);
    const status = i === 3 ? 'EXCUSED' : 'PRESENT';
    await prisma.attendanceRecord.upsert({
      where: {
        studentId_classId_date: {
          studentId: 's-diya-02',
          classId: 'class-neet-batch-b',
          date: recordDate,
        },
      },
      update: { status, remarks: status === 'EXCUSED' ? 'Medical slip' : 'Present' },
      create: {
        id: `att-diya-${d}`,
        studentId: 's-diya-02',
        classId: 'class-neet-batch-b',
        date: recordDate,
        status,
        remarks: status === 'EXCUSED' ? 'Medical slip' : 'Present',
      },
    });
    attInserted++;
  }

  // Student 3 (Rohit): 3 consecutive absences on 22, 23, 24 Oct (At-Risk Case)
  for (let i = 0; i < sessionDates.length; i++) {
    const d = sessionDates[i];
    const recordDate = new Date(`${d}T09:00:00.000Z`);
    const isConsecutiveAbsent = i >= sessionDates.length - 3;
    const status = isConsecutiveAbsent ? 'ABSENT' : 'PRESENT';
    await prisma.attendanceRecord.upsert({
      where: {
        studentId_classId_date: {
          studentId: 's-rohit-03',
          classId: 'class-jee-batch-a',
          date: recordDate,
        },
      },
      update: { status, remarks: isConsecutiveAbsent ? 'Unexcused consecutive absence' : 'Present' },
      create: {
        id: `att-rohit-${d}`,
        studentId: 's-rohit-03',
        classId: 'class-jee-batch-a',
        date: recordDate,
        status,
        remarks: isConsecutiveAbsent ? 'Unexcused consecutive absence' : 'Present',
      },
    });
    attInserted++;
  }

  // Student 5 (Kavya): Low attendance <75% (4 present, 2 excused, 4 absent)
  for (let i = 0; i < sessionDates.length; i++) {
    const d = sessionDates[i];
    const recordDate = new Date(`${d}T09:00:00.000Z`);
    let st = 'PRESENT';
    if (i < 4) st = 'PRESENT';
    else if (i < 6) st = 'EXCUSED';
    else st = 'ABSENT';

    await prisma.attendanceRecord.upsert({
      where: {
        studentId_classId_date: {
          studentId: 's-kavya-05',
          classId: 'class-fnd-batch-c',
          date: recordDate,
        },
      },
      update: { status: st, remarks: st === 'EXCUSED' ? 'Sick leave' : undefined },
      create: {
        id: `att-kavya-${d}`,
        studentId: 's-kavya-05',
        classId: 'class-fnd-batch-c',
        date: recordDate,
        status: st,
        remarks: st === 'EXCUSED' ? 'Sick leave' : undefined,
      },
    });
    attInserted++;
  }

  // Technical classes demo student attendance records
  const allEnrolments = await prisma.enrolment.findMany({
    where: { studentId: { startsWith: 'stu-' } },
    take: 20,
  });

  for (const enr of allEnrolments) {
    for (let i = 0; i < sessionDates.length; i++) {
      const d = sessionDates[i];
      const recordDate = new Date(`${d}T10:00:00.000Z`);
      const status = (i + enr.studentId.charCodeAt(enr.studentId.length - 1)) % 10 === 0 ? 'ABSENT' : 'PRESENT';

      await prisma.attendanceRecord.upsert({
        where: {
          studentId_classId_date: {
            studentId: enr.studentId,
            classId: enr.classId,
            date: recordDate,
          },
        },
        update: { status },
        create: {
          id: `att-${enr.studentId}-${d}`,
          studentId: enr.studentId,
          classId: enr.classId,
          date: recordDate,
          status,
          remarks: status === 'ABSENT' ? 'Personal leave' : 'Present',
        },
      });
      attInserted++;
    }
  }

  console.log(`  ✓ Successfully seeded ${attInserted} attendance records in PostgreSQL.`);

  // 4. Seed Real Engagement Flags in PostgreSQL
  console.log('\nStep 4: Seeding Real At-Risk Engagement Flags in PostgreSQL...');
  const flagsToSeed = [
    {
      id: 'flag-rohit-01',
      studentId: 's-rohit-03',
      rule: 'CONSECUTIVE_ABSENCES',
      severity: 'HIGH',
      evidence: 'Student has 3 consecutive unexcused absences on 22, 23, 24 Oct 2026.',
      observationWindowStart: new Date('2026-10-15T00:00:00.000Z'),
      observationWindowEnd: new Date('2026-10-25T00:00:00.000Z'),
      suggestedAction: 'Immediate telephone intervention with parent/guardian.',
      status: 'ACTIVE',
    },
    {
      id: 'flag-kavya-02',
      studentId: 's-kavya-05',
      rule: 'LOW_ATTENDANCE_WINDOW',
      severity: 'MEDIUM',
      evidence: 'Student 30-day attendance is at 60.0%, falling below the 75% institutional threshold.',
      observationWindowStart: new Date('2026-10-01T00:00:00.000Z'),
      observationWindowEnd: new Date('2026-10-25T00:00:00.000Z'),
      suggestedAction: 'Issue academic attendance warning letter and assign counselling mentor.',
      status: 'ACTIVE',
    },
  ];

  for (const flag of flagsToSeed) {
    await prisma.engagementFlag.upsert({
      where: {
        studentId_rule_observationWindowStart_observationWindowEnd: {
          studentId: flag.studentId,
          rule: flag.rule,
          observationWindowStart: flag.observationWindowStart,
          observationWindowEnd: flag.observationWindowEnd,
        },
      },
      update: {
        severity: flag.severity,
        evidence: flag.evidence,
        suggestedAction: flag.suggestedAction,
        status: flag.status,
      },
      create: flag,
    });
    console.log(`  ✓ Flag: [${flag.severity}] ${flag.rule} for student ${flag.studentId}`);
  }

  console.log('\n======================================================');
  console.log('  ACADEMIC DATA SEEDING COMPLETE!                     ');
  console.log('======================================================\n');
}

if (process.argv[1]?.includes('seed-academic')) {
  seedAcademicData()
    .catch((err) => {
      console.error('Seed academic error:', err);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}


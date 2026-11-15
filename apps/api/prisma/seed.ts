import { PrismaClient } from '@prisma/client';
import {
  SEED_USERS,
  SEED_COUNSELLORS,
  SEED_COURSES,
  SEED_CLASSES,
  SEED_STUDENTS,
  SEED_LEADS,
  SEED_SYSTEM_SETTINGS,
} from '../src/store/seedData.js';

const prisma = new PrismaClient();

async function main() {
  console.log('--- SEEDING DATABASE WITH DETERMINISTIC SYNTHETIC DATA ---');

  // 1. Seed System Settings
  for (const [key, value] of Object.entries(SEED_SYSTEM_SETTINGS)) {
    await prisma.systemSetting.upsert({
      where: { key },
      update: { value: JSON.stringify(value) },
      create: { key, value: JSON.stringify(value), description: `Default setting for ${key}` },
    });
  }

  // 2. Seed Users
  for (const u of SEED_USERS) {
    await prisma.user.upsert({
      where: { email: u.email },
      update: { name: u.name, role: u.role, passwordHash: u.passwordHash },
      create: {
        id: u.id,
        email: u.email,
        name: u.name,
        role: u.role,
        passwordHash: u.passwordHash,
        isActive: u.isActive,
      },
    });
  }

  // 3. Seed Counsellors & Supported Courses
  for (const c of SEED_COUNSELLORS) {
    const counsellor = await prisma.counsellor.upsert({
      where: { email: c.email },
      update: {
        name: c.name,
        workingHoursStart: c.workingHoursStart,
        workingHoursEnd: c.workingHoursEnd,
        isAvailable: c.isAvailable,
        maxWorkload: c.maxWorkload,
        currentWorkload: c.currentWorkload,
      },
      create: {
        id: c.id,
        userId: c.userId,
        name: c.name,
        email: c.email,
        workingHoursStart: c.workingHoursStart,
        workingHoursEnd: c.workingHoursEnd,
        isAvailable: c.isAvailable,
        maxWorkload: c.maxWorkload,
        currentWorkload: c.currentWorkload,
      },
    });

    for (const courseName of c.supportedCourses) {
      await prisma.counsellorCourse.upsert({
        where: {
          counsellorId_courseName: {
            counsellorId: counsellor.id,
            courseName,
          },
        },
        update: {},
        create: {
          counsellorId: counsellor.id,
          courseName,
        },
      });
    }
  }

  // 4. Seed Courses & Classes
  for (const crs of SEED_COURSES) {
    await prisma.course.upsert({
      where: { courseCode: crs.courseCode },
      update: { title: crs.title, description: crs.description },
      create: crs,
    });
  }

  for (const cls of SEED_CLASSES) {
    await prisma.class.upsert({
      where: { classCode: cls.classCode },
      update: { name: cls.name, schedule: cls.schedule },
      create: cls,
    });
  }

  // 5. Seed Students, Guardians & Enrollments
  for (const s of SEED_STUDENTS) {
    const student = await prisma.student.upsert({
      where: { studentIdNumber: s.studentIdNumber },
      update: { name: s.name, email: s.email, phone: s.phone },
      create: {
        id: s.id,
        studentIdNumber: s.studentIdNumber,
        name: s.name,
        email: s.email,
        phone: s.phone,
        enrollmentStatus: s.enrollmentStatus,
      },
    });

    await prisma.enrolment.upsert({
      where: {
        studentId_classId: {
          studentId: student.id,
          classId: s.classId,
        },
      },
      update: {},
      create: {
        studentId: student.id,
        classId: s.classId,
        status: 'ACTIVE',
      },
    });

    const guardian = await prisma.guardian.create({
      data: {
        studentId: student.id,
        name: s.guardian.name,
        relationship: s.guardian.relationship,
        email: s.guardian.email,
        phone: s.guardian.phone,
      },
    });

    await prisma.guardianPreference.create({
      data: {
        guardianId: guardian.id,
        preferredChannel: s.guardian.preferredChannel,
        consentGiven: s.guardian.consentGiven,
      },
    });
  }

  // 6. Seed Leads
  for (const l of SEED_LEADS) {
    await prisma.lead.upsert({
      where: { id: l.id },
      update: { stage: l.stage as any, score: l.score, scoreCategory: l.scoreCategory as any },
      create: {
        id: l.id,
        studentName: l.studentName,
        email: l.email,
        phone: l.phone,
        rawEmail: l.rawEmail,
        rawPhone: l.rawPhone,
        courseInterest: l.courseInterest,
        preferredStartDate: l.preferredStartDate ? new Date(l.preferredStartDate) : null,
        preferredCounsellingTime: l.preferredCounsellingTime,
        source: l.source as any,
        stage: l.stage as any,
        score: l.score,
        scoreCategory: l.scoreCategory as any,
        assignedCounsellorId: l.assignedCounsellorId,
        freeTextInterests: l.freeTextInterests,
        aiSummary: l.aiSummary,
        communicationConsent: l.communicationConsent,
        optedOut: l.optedOut,
      },
    });
  }

  console.log('--- SEEDING COMPLETED SUCCESSFULLY ---');
}

main()
  .catch((e) => {
    console.error('Seed execution error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

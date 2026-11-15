import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function resetDevDatabase() {
  if (process.env.NODE_ENV === 'production') {
    console.error('CRITICAL SAFETY BLOCK: Database reset script is prohibited in production environment!');
    process.exit(1);
  }

  console.log('--- SAFE DEV RESET: Starting cleanup of all transactional and operational records ---');

  try {
    // Delete in reverse FK dependency order
    await prisma.messageApproval.deleteMany({});
    await prisma.weeklySummary.deleteMany({});
    await prisma.interventionTask.deleteMany({});
    await prisma.engagementFlag.deleteMany({});
    await prisma.importError.deleteMany({});
    await prisma.importBatch.deleteMany({});
    await prisma.assignmentRecord.deleteMany({});
    await prisma.assessmentRecord.deleteMany({});
    await prisma.attendanceRecord.deleteMany({});
    await prisma.guardianPreference.deleteMany({});
    await prisma.guardian.deleteMany({});
    await prisma.enrolment.deleteMany({});
    await prisma.class.deleteMany({});
    await prisma.course.deleteMany({});
    await prisma.student.deleteMany({});

    await prisma.leadMergeReview.deleteMany({});
    await prisma.communicationLog.deleteMany({});
    await prisma.communicationConsent.deleteMany({});
    await prisma.followUpTask.deleteMany({});
    await prisma.leadStageHistory.deleteMany({});
    await prisma.leadAssignment.deleteMany({});
    await prisma.leadScoreHistory.deleteMany({});
    await prisma.lead.deleteMany({});
    await prisma.counsellorCourse.deleteMany({});
    await prisma.counsellor.deleteMany({});
    await prisma.leadSourceRecord.deleteMany({});

    await prisma.idempotencyRecord.deleteMany({});
    await prisma.notificationEvent.deleteMany({});
    await prisma.auditLog.deleteMany({});
    await prisma.systemSetting.deleteMany({});
    await prisma.user.deleteMany({});

    console.log('--- SAFE DEV RESET: Database successfully reset to clean state ---');
  } catch (error) {
    console.error('Safe dev reset failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

resetDevDatabase();

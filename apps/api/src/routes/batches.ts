import { Router, Request, Response } from 'express';
import { authenticate, requireRole } from '../middleware/auth.js';
import { getPrisma } from '../prisma.js';
import { store } from '../store/index.js';
import { logger } from '../logger.js';

const router = Router();

// GET /api/batches (List all batches/classes)
router.get('/batches', authenticate, async (req: Request, res: Response) => {
  const prisma = getPrisma();

  if (prisma) {
    try {
      const batches = await prisma.class.findMany({
        include: {
          course: true,
          enrolments: {
            include: {
              student: {
                select: { id: true, studentIdNumber: true, name: true, email: true, feeStatus: true, studentStatus: true },
              },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      });

      return res.json({
        success: true,
        count: batches.length,
        batches: batches.map((b) => ({
          id: b.id,
          classCode: b.classCode,
          name: b.name,
          courseId: b.courseId,
          courseName: b.course?.title || 'Unassigned',
          schedule: b.schedule || 'Mon-Fri 09:00 - 12:30',
          maxCapacity: b.maxCapacity || 40,
          enrolledCount: b.enrolments.length,
          status: b.status || 'ACTIVE',
          startDate: b.startDate,
          endDate: b.endDate,
          students: b.enrolments.map((e) => e.student),
          createdAt: b.createdAt,
        })),
      });
    } catch (err: any) {
      logger.warn({ err: err.message }, 'Failed to fetch batches from DB, falling back');
    }
  }

  // Fallback
  const memClasses = store.getState().classes.map((c) => ({
    ...c,
    courseName: 'General Track',
    enrolledCount: store.getState().enrolments.filter((e) => e.classId === c.id).length,
    maxCapacity: 40,
    status: 'ACTIVE',
  }));

  return res.json({ success: true, count: memClasses.length, batches: memClasses });
});

// POST /api/batches (Create a batch/class)
router.post('/batches', authenticate, requireRole('ADMIN', 'MANAGER'), async (req: Request, res: Response) => {
  const { classCode, name, courseId, schedule = 'Mon-Fri 09:00 - 12:30', maxCapacity = 40, status = 'ACTIVE' } = req.body;

  if (!classCode || !name || !courseId) {
    return res.status(400).json({ success: false, error: 'classCode, name, and courseId are required' });
  }

  const prisma = getPrisma();
  if (prisma) {
    try {
      const existing = await prisma.class.findUnique({ where: { classCode } });
      if (existing) {
        return res.status(409).json({ success: false, error: `Batch code '${classCode}' already exists` });
      }

      const batch = await prisma.class.create({
        data: {
          id: `class-${Date.now()}`,
          classCode: classCode.trim().toUpperCase(),
          name: name.trim(),
          courseId,
          schedule,
          maxCapacity: Number(maxCapacity) || 40,
          status,
        },
        include: { course: true },
      });

      return res.status(201).json({ success: true, batch });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  const newBatch = {
    id: `class-${Date.now()}`,
    classCode: classCode.trim().toUpperCase(),
    name: name.trim(),
    courseId,
    schedule,
    maxCapacity: Number(maxCapacity) || 40,
    status,
    enrolledCount: 0,
    createdAt: new Date().toISOString(),
  };
  store.getState().classes.push(newBatch as any);

  return res.status(201).json({ success: true, batch: newBatch });
});

// POST /api/batches/:id/enroll (Enroll student into batch)
router.post('/batches/:id/enroll', authenticate, requireRole('ADMIN', 'MANAGER', 'FACULTY', 'TEACHER'), async (req: Request, res: Response) => {
  const { id: classId } = req.params;
  const { studentId } = req.body;

  if (!studentId) {
    return res.status(400).json({ success: false, error: 'studentId is required' });
  }

  const prisma = getPrisma();
  if (prisma) {
    try {
      const enrolment = await prisma.enrolment.upsert({
        where: { studentId_classId: { studentId, classId } },
        update: { status: 'ACTIVE' },
        create: {
          id: `enr-${studentId}-${classId}`,
          studentId,
          classId,
          status: 'ACTIVE',
        },
      });

      return res.json({ success: true, message: 'Student enrolled into batch successfully', enrolment });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  const existing = store.getState().enrolments.find((e) => e.studentId === studentId && e.classId === classId);
  if (!existing) {
    store.getState().enrolments.push({
      id: `enr-${Date.now()}`,
      studentId,
      classId,
      status: 'ACTIVE',
      enrolledAt: new Date().toISOString(),
    });
  }

  return res.json({ success: true, message: 'Student enrolled into batch successfully' });
});

export default router;

import { Router, Request, Response } from 'express';
import { authenticate, requireRole } from '../middleware/auth.js';
import { getPrisma } from '../prisma.js';
import { store } from '../store/index.js';
import { logger } from '../logger.js';

const router = Router();

// GET /api/courses (List all courses with class count and student count)
router.get('/courses', authenticate, async (req: Request, res: Response) => {
  const prisma = getPrisma();

  if (prisma) {
    try {
      const courses = await prisma.course.findMany({
        include: {
          classes: true,
          _count: {
            select: { students: true, classes: true },
          },
        },
        orderBy: { createdAt: 'desc' },
      });

      return res.json({
        success: true,
        count: courses.length,
        courses: courses.map((c) => ({
          id: c.id,
          courseCode: c.courseCode,
          title: c.title,
          description: c.description,
          duration: c.duration || '6 Months',
          fee: c.fee || 45000,
          status: c.status || 'ACTIVE',
          facultyId: c.facultyId,
          classesCount: c._count.classes,
          enrolledStudentsCount: c._count.students,
          createdAt: c.createdAt,
        })),
      });
    } catch (err: any) {
      logger.warn({ err: err.message }, 'Failed to fetch courses from DB, falling back');
    }
  }

  // In-memory fallback
  const memCourses = [
    { id: 'course-jee-adv', courseCode: 'JEE-ADV-2027', title: 'JEE Advanced FastTrack', duration: '2 Years', fee: 120000, status: 'ACTIVE', enrolledStudentsCount: 20 },
    { id: 'course-neet-comp', courseCode: 'NEET-COMP-2027', title: 'NEET Comprehensive', duration: '2 Years', fee: 110000, status: 'ACTIVE', enrolledStudentsCount: 15 },
    { id: 'course-fnd-10', courseCode: 'FND-10TH-2026', title: 'Foundation Achievers (10th)', duration: '1 Year', fee: 65000, status: 'ACTIVE', enrolledStudentsCount: 10 },
    { id: 'course-java-fs', courseCode: 'JAVA-FS-2026', title: 'Java Full Stack', duration: '6 Months', fee: 45000, status: 'ACTIVE', enrolledStudentsCount: 30 },
    { id: 'course-py-fs', courseCode: 'PY-FS-2026', title: 'Python Full Stack', duration: '6 Months', fee: 45000, status: 'ACTIVE', enrolledStudentsCount: 25 },
    { id: 'course-web-dev', courseCode: 'WEB-DEV-2026', title: 'Web Development', duration: '4 Months', fee: 35000, status: 'ACTIVE', enrolledStudentsCount: 20 },
    { id: 'course-data-analytics', courseCode: 'DATA-ANLYT-2026', title: 'Data Analytics', duration: '6 Months', fee: 50000, status: 'ACTIVE', enrolledStudentsCount: 25 },
  ];

  return res.json({ success: true, count: memCourses.length, courses: memCourses });
});

// POST /api/courses (Create a course)
router.post('/courses', authenticate, requireRole('ADMIN', 'MANAGER'), async (req: Request, res: Response) => {
  const { courseCode, title, description, duration = '6 Months', fee = 45000, status = 'ACTIVE', facultyId } = req.body;

  if (!courseCode || !title) {
    return res.status(400).json({ success: false, error: 'courseCode and title are required' });
  }

  const prisma = getPrisma();
  if (prisma) {
    try {
      const existing = await prisma.course.findUnique({ where: { courseCode } });
      if (existing) {
        return res.status(409).json({ success: false, error: `Course code '${courseCode}' already exists` });
      }

      const course = await prisma.course.create({
        data: {
          id: `course-${Date.now()}`,
          courseCode: courseCode.trim().toUpperCase(),
          title: title.trim(),
          description: description?.trim() || null,
          duration,
          fee: Number(fee) || 0,
          status,
          facultyId: facultyId || null,
        },
      });

      return res.status(201).json({ success: true, course });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  const newCourse = {
    id: `course-${Date.now()}`,
    courseCode: courseCode.trim().toUpperCase(),
    title: title.trim(),
    description: description || null,
    duration,
    fee: Number(fee) || 0,
    status,
    enrolledStudentsCount: 0,
    createdAt: new Date().toISOString(),
  };

  return res.status(201).json({ success: true, course: newCourse });
});

export default router;

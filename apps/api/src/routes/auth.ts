import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { loginSchema, registerSchema, systemSettingsSchema } from '@team-b/shared';
import { config } from '../config.js';
import { store } from '../store/index.js';
import { authenticate, requireRole } from '../middleware/auth.js';
import { loginLimiter } from '../middleware/rateLimiter.js';
import { getPrisma } from '../prisma.js';

const router = Router();

// POST /api/auth/register
router.post('/register', async (req: Request, res: Response) => {
  const parsed = registerSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      success: false,
      error: 'Invalid registration input',
      details: parsed.error.issues,
    });
  }

  const { email, password, name, role } = parsed.data;
  const normalizedEmail = email.trim().toLowerCase();

  const prisma = getPrisma();
  let existingUser: any = null;

  if (prisma) {
    try {
      existingUser = await prisma.user.findUnique({ where: { email: normalizedEmail } });
    } catch {}
  }

  if (!existingUser) {
    existingUser = store.getState().users.find(
      (u) => u.email.toLowerCase() === normalizedEmail
    );
  }

  if (existingUser) {
    return res.status(409).json({
      success: false,
      error: 'User already exists with this email address',
    });
  }

  const saltRounds = 10;
  const passwordHash = await bcrypt.hash(password, saltRounds);

  const newId = `u-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;

  // Create in Prisma if available
  if (prisma) {
    try {
      await prisma.user.create({
        data: {
          id: newId,
          email: normalizedEmail,
          passwordHash,
          name,
          role: role as any,
          isActive: true,
        },
      });
    } catch {}
  }

  const newUser = {
    id: newId,
    email: normalizedEmail,
    passwordHash,
    name,
    role,
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  store.getState().users.push(newUser as any);

  // If registering as a counsellor, automatically provision counsellor profile
  if (role === 'ADMISSIONS_COUNSELLOR' || role === 'COUNSELLOR') {
    store.getState().counsellors.push({
      id: `c-${newUser.id}`,
      userId: newUser.id,
      name: newUser.name,
      email: newUser.email,
      supportedCourses: ['JEE Advanced', 'NEET UG', 'Foundation 9-10'],
      workingHoursStart: '09:00',
      workingHoursEnd: '18:00',
      isAvailable: true,
      maxWorkload: 25,
      currentWorkload: 0,
    });
  }

  const token = jwt.sign(
    {
      id: newUser.id,
      email: newUser.email,
      name: newUser.name,
      role: newUser.role,
    },
    config.jwtSecret,
    { expiresIn: config.jwtExpiresIn as any }
  );

  res.cookie('token', token, {
    httpOnly: true,
    secure: config.env === 'production',
    sameSite: config.env === 'production' ? 'none' : 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });

  store.logAudit({
    userId: newUser.id,
    userEmail: newUser.email,
    action: 'USER_REGISTERED',
    entityType: 'User',
    entityId: newUser.id,
    details: { role: newUser.role },
    ipAddress: req.ip,
  });

  return res.status(201).json({
    success: true,
    user: {
      id: newUser.id,
      email: newUser.email,
      name: newUser.name,
      role: newUser.role,
    },
    token,
  });
});

// POST /api/auth/login
router.post('/login', loginLimiter, async (req: Request, res: Response) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      success: false,
      error: 'Invalid input',
      details: parsed.error.issues,
    });
  }

  const { email, password } = parsed.data;
  const normalizedEmail = email.trim().toLowerCase();

  const prisma = getPrisma();
  let user: any = null;

  if (prisma) {
    try {
      user = await prisma.user.findUnique({
        where: { email: normalizedEmail },
      });
    } catch {}
  }

  // Fallback to in-memory store
  if (!user) {
    user = store.getState().users.find(
      (u) => u.email.toLowerCase() === normalizedEmail
    );
  }

  if (!user || user.isActive === false) {
    return res.status(401).json({
      success: false,
      error: 'Invalid email or password',
    });
  }

  const isValidPassword = await bcrypt.compare(password, user.passwordHash);
  if (!isValidPassword) {
    store.logAudit({
      userId: user.id,
      userEmail: user.email,
      action: 'LOGIN_FAILED',
      entityType: 'User',
      entityId: user.id,
      ipAddress: req.ip,
    });

    return res.status(401).json({
      success: false,
      error: 'Invalid email or password',
    });
  }

  const token = jwt.sign(
    {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    },
    config.jwtSecret,
    { expiresIn: '7d' }
  );

  // Set httpOnly cookie
  res.cookie('token', token, {
    httpOnly: true,
    secure: config.env === 'production',
    sameSite: config.env === 'production' ? 'none' : 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  });

  store.logAudit({
    userId: user.id,
    userEmail: user.email,
    action: 'LOGIN_SUCCESS',
    entityType: 'User',
    entityId: user.id,
    ipAddress: req.ip,
  });

  return res.json({
    success: true,
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    },
    token, // Also return in body for client flexibility
  });
});

// POST /api/auth/logout
router.post('/logout', (req: Request, res: Response) => {
  res.clearCookie('token', {
    httpOnly: true,
    secure: config.env === 'production',
    sameSite: config.env === 'production' ? 'none' : 'lax',
  });
  return res.json({ success: true, message: 'Successfully logged out' });
});

// GET /api/auth/me
router.get('/me', authenticate, (req: Request, res: Response) => {
  return res.json({
    success: true,
    user: req.user,
  });
});

// GET /api/settings
router.get('/settings', authenticate, (req: Request, res: Response) => {
  const settings = store.getState().systemSettings;
  return res.json({ success: true, settings });
});

// PATCH /api/settings (Admin only)
router.patch(
  '/settings',
  authenticate,
  requireRole('ADMIN'),
  (req: Request, res: Response) => {
    const parsed = systemSettingsSchema.partial().safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        error: 'Invalid settings configuration',
        details: parsed.error.issues,
      });
    }

    const current = store.getState().systemSettings;
    const updated = { ...current, ...parsed.data };
    store.getState().systemSettings = updated as any;

    store.logAudit({
      userId: req.user?.id,
      userEmail: req.user?.email,
      action: 'SETTINGS_UPDATED',
      entityType: 'SystemSetting',
      details: parsed.data,
      ipAddress: req.ip,
    });

    return res.json({ success: true, settings: updated });
  }
);

// GET /api/audit-logs
router.get(
  '/audit-logs',
  authenticate,
  requireRole('ADMIN', 'ACADEMIC_COORDINATOR'),
  (req: Request, res: Response) => {
    const { entityType, action, limit = '50' } = req.query;
    let logs = store.getState().auditLogs;

    if (entityType) {
      logs = logs.filter((l) => l.entityType === entityType);
    }
    if (action) {
      logs = logs.filter((l) => l.action === action);
    }

    const parsedLimit = Math.min(100, Math.max(1, parseInt(limit as string, 10)));
    return res.json({
      success: true,
      logs: logs.slice(0, parsedLimit),
      total: logs.length,
    });
  }
);

export default router;

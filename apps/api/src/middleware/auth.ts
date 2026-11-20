import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config.js';
import { UserRole } from '@team-b/shared';
import { store } from '../store/index.js';
import { getPrisma } from '../prisma.js';

export interface AuthenticatedUser {
  id: string;
  email: string;
  name: string;
  role: UserRole | string;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
    }
  }
}

export async function authenticate(req: Request, res: Response, next: NextFunction) {
  let token: string | undefined;

  // 1. Check cookies (httpOnly)
  if (req.cookies && (req.cookies.token || req.cookies.jwt)) {
    token = req.cookies.token || req.cookies.jwt;
  }

  // 2. Fallback to Authorization header
  if (!token && req.headers.authorization) {
    const parts = req.headers.authorization.split(' ');
    if (parts.length === 2 && parts[0] === 'Bearer') {
      token = parts[1];
    }
  }

  if (!token) {
    return res.status(401).json({
      success: false,
      error: 'Authentication required. No session or token found.',
    });
  }

  try {
    const decoded = jwt.verify(token, config.jwtSecret) as any;
    let user: any = null;

    // Check PostgreSQL first if available
    const prisma = getPrisma();
    if (prisma) {
      try {
        user = await prisma.user.findUnique({
          where: { id: decoded.id },
        });
      } catch {}
    }

    // Fallback to in-memory store
    if (!user) {
      user = store.getState().users.find((u) => u.id === decoded.id || u.email.toLowerCase() === decoded.email?.toLowerCase());
    }

    if (!user || user.isActive === false) {
      return res.status(401).json({
        success: false,
        error: 'User account not found or deactivated.',
      });
    }

    req.user = {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    };
    next();
  } catch (err) {
    return res.status(401).json({
      success: false,
      error: 'Invalid or expired token.',
    });
  }
}

/**
 * Server-side RBAC middleware.
 * Enforces server-side permissions (UI hiding alone is never enough).
 */
export function requireRole(...allowedRoles: (UserRole | string)[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required.',
      });
    }

    const userRole = req.user.role;
    // Admins always have access
    if (userRole === 'ADMIN') {
      return next();
    }

    // Role aliases & hierarchy
    const roleAliases: Record<string, string[]> = {
      COUNSELLOR: ['COUNSELLOR', 'ADMISSIONS_COUNSELLOR'],
      ADMISSIONS_COUNSELLOR: ['COUNSELLOR', 'ADMISSIONS_COUNSELLOR'],
      FACULTY: ['FACULTY', 'TEACHER'],
      TEACHER: ['FACULTY', 'TEACHER'],
      MANAGER: ['MANAGER', 'ACADEMIC_COORDINATOR'],
      ACADEMIC_COORDINATOR: ['MANAGER', 'ACADEMIC_COORDINATOR'],
    };

    const expandedAllowed = new Set<string>();
    for (const r of allowedRoles) {
      expandedAllowed.add(r);
      const aliases = roleAliases[r];
      if (aliases) aliases.forEach((a) => expandedAllowed.add(a));
    }

    if (!expandedAllowed.has(userRole)) {
      return res.status(403).json({
        success: false,
        error: `Forbidden. Role '${userRole}' is not authorized for this resource.`,
      });
    }

    next();
  };
}

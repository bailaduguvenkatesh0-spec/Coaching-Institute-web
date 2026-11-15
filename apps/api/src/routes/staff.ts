import { Router, Request, Response } from 'express';
import { createStaffSchema, updateStaffSchema, StaffItem } from '@team-b/shared';
import { getPrisma } from '../prisma.js';
import { store } from '../store/index.js';
import { authenticate, requireRole } from '../middleware/auth.js';
import { logger } from '../logger.js';
import { randomUUID } from 'crypto';

const router = Router();

// GET /api/staff/stats (Dynamic metrics)
router.get('/staff/stats', authenticate, async (req: Request, res: Response) => {
  try {
    const prisma = getPrisma();
    let staffList: any[] = [];

    if (prisma) {
      try {
        staffList = await prisma.staff.findMany();
      } catch (dbErr) {
        logger.warn({ err: dbErr }, 'Failed to fetch staff stats from DB, falling back to memory store');
        staffList = store.staff || [];
      }
    } else {
      staffList = store.staff || [];
    }

    const total = staffList.length;
    const active = staffList.filter((s) => s.employmentStatus === 'ACTIVE').length;
    const inactive = staffList.filter((s) => s.employmentStatus !== 'ACTIVE').length;

    const byDepartment: Record<string, number> = {};
    for (const s of staffList) {
      const dept = s.department || 'Unassigned';
      byDepartment[dept] = (byDepartment[dept] || 0) + 1;
    }

    return res.json({
      success: true,
      data: {
        total,
        active,
        inactive,
        byDepartment,
      },
    });
  } catch (err: any) {
    logger.error({ err }, 'Error calculating staff stats');
    return res.status(500).json({ success: false, error: 'Failed to calculate staff statistics' });
  }
});

// GET /api/staff (List with search and filters)
router.get('/staff', authenticate, async (req: Request, res: Response) => {
  try {
    const { search, department, status } = req.query;
    const prisma = getPrisma();
    let staffList: any[] = [];

    if (prisma) {
      try {
        staffList = await prisma.staff.findMany({
          orderBy: { staffId: 'asc' },
        });
      } catch (dbErr) {
        logger.warn({ err: dbErr }, 'Failed to query staff from DB, falling back to memory store');
        staffList = [...(store.staff || [])];
      }
    } else {
      staffList = [...(store.staff || [])];
    }

    // Apply filtering
    if (search && typeof search === 'string') {
      const q = search.trim().toLowerCase();
      staffList = staffList.filter(
        (s) =>
          (s.fullName && s.fullName.toLowerCase().includes(q)) ||
          (s.staffId && s.staffId.toLowerCase().includes(q)) ||
          (s.email && s.email.toLowerCase().includes(q)) ||
          (s.designation && s.designation.toLowerCase().includes(q))
      );
    }

    if (department && typeof department === 'string' && department !== 'ALL') {
      staffList = staffList.filter(
        (s) => (s.department || '').toLowerCase() === department.trim().toLowerCase()
      );
    }

    if (status && typeof status === 'string' && status !== 'ALL') {
      staffList = staffList.filter(
        (s) => s.employmentStatus.toUpperCase() === status.trim().toUpperCase()
      );
    }

    return res.json({
      success: true,
      count: staffList.length,
      data: staffList,
    });
  } catch (err: any) {
    logger.error({ err }, 'Error fetching staff records');
    return res.status(500).json({ success: false, error: 'Failed to fetch staff members' });
  }
});

// GET /api/staff/:id (Single profile)
router.get('/staff/:id', authenticate, async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    const prisma = getPrisma();
    let member: any = null;

    if (prisma) {
      try {
        member = await prisma.staff.findFirst({
          where: {
            OR: [{ id }, { staffId: id }],
          },
        });
      } catch (dbErr) {
        member = store.staff.find((s) => s.id === id || s.staffId === id);
      }
    } else {
      member = store.staff.find((s) => s.id === id || s.staffId === id);
    }

    if (!member) {
      return res.status(404).json({ success: false, error: 'Staff member not found' });
    }

    return res.json({ success: true, data: member });
  } catch (err: any) {
    logger.error({ err }, 'Error fetching staff profile');
    return res.status(500).json({ success: false, error: 'Failed to retrieve staff member' });
  }
});

// POST /api/staff (Create new staff member - Admin only)
router.post('/staff', authenticate, requireRole('ADMIN'), async (req: Request, res: Response) => {
  const parsed = createStaffSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      success: false,
      error: 'Validation failed',
      details: parsed.error.issues,
    });
  }

  const data = parsed.data;
  const staffId = data.staffId.trim().toUpperCase();

  try {
    const prisma = getPrisma();

    // Check for duplicate staffId
    if (prisma) {
      try {
        const existing = await prisma.staff.findUnique({ where: { staffId } });
        if (existing) {
          return res.status(409).json({
            success: false,
            error: `Staff member with ID '${staffId}' already exists`,
          });
        }
        if (data.email) {
          const emailExisting = await prisma.staff.findUnique({ where: { email: data.email } });
          if (emailExisting) {
            return res.status(409).json({
              success: false,
              error: `Staff member with email '${data.email}' already exists`,
            });
          }
        }
      } catch (dbErr) {
        logger.warn({ err: dbErr }, 'Prisma uniqueness check bypassed');
      }
    }

    const inMemoryExisting = store.staff.find((s) => s.staffId.toUpperCase() === staffId);
    if (inMemoryExisting) {
      return res.status(409).json({
        success: false,
        error: `Staff member with ID '${staffId}' already exists`,
      });
    }

    const newRecord: StaffItem = {
      id: randomUUID(),
      staffId,
      fullName: data.fullName.trim(),
      email: data.email ? data.email.trim().toLowerCase() : null,
      phone: data.phone ? data.phone.trim() : null,
      designation: data.designation ? data.designation.trim() : null,
      department: data.department ? data.department.trim() : null,
      joiningDate: data.joiningDate ? new Date(data.joiningDate).toISOString() : null,
      employmentStatus: data.employmentStatus as any,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    if (prisma) {
      try {
        const created = await prisma.staff.create({
          data: {
            id: newRecord.id,
            staffId: newRecord.staffId,
            fullName: newRecord.fullName,
            email: newRecord.email,
            phone: newRecord.phone,
            designation: newRecord.designation,
            department: newRecord.department,
            joiningDate: newRecord.joiningDate ? new Date(newRecord.joiningDate) : null,
            employmentStatus: newRecord.employmentStatus as any,
            createdAt: new Date(newRecord.createdAt),
            updatedAt: new Date(newRecord.updatedAt),
          },
        });
        store.staff.push({ ...created, joiningDate: created.joiningDate?.toISOString() || null });
        return res.status(201).json({ success: true, data: created });
      } catch (dbErr: any) {
        logger.warn({ err: dbErr }, 'DB insert failed, storing in memory store');
      }
    }

    store.staff.push(newRecord);
    return res.status(201).json({ success: true, data: newRecord });
  } catch (err: any) {
    logger.error({ err }, 'Error creating staff record');
    return res.status(500).json({ success: false, error: err.message || 'Failed to create staff member' });
  }
});

// PUT /api/staff/:id (Update staff member - Admin only)
router.put('/staff/:id', authenticate, requireRole('ADMIN'), async (req: Request, res: Response) => {
  const { id } = req.params;
  const parsed = updateStaffSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      success: false,
      error: 'Validation failed',
      details: parsed.error.issues,
    });
  }

  const data = parsed.data;

  try {
    const prisma = getPrisma();
    let currentStaff: any = null;

    if (prisma) {
      try {
        currentStaff = await prisma.staff.findFirst({
          where: { OR: [{ id }, { staffId: id }] },
        });
      } catch (dbErr) {
        currentStaff = store.staff.find((s) => s.id === id || s.staffId === id);
      }
    } else {
      currentStaff = store.staff.find((s) => s.id === id || s.staffId === id);
    }

    if (!currentStaff) {
      return res.status(404).json({ success: false, error: 'Staff member not found' });
    }

    // Check email uniqueness if email is changed
    if (data.email && data.email !== currentStaff.email && prisma) {
      try {
        const conflict = await prisma.staff.findFirst({
          where: { email: data.email, NOT: { id: currentStaff.id } },
        });
        if (conflict) {
          return res.status(409).json({
            success: false,
            error: `Another staff member is already registered with email '${data.email}'`,
          });
        }
      } catch (e) {
        // ignore
      }
    }

    const updatedData = {
      fullName: data.fullName !== undefined ? data.fullName.trim() : currentStaff.fullName,
      email: data.email !== undefined ? (data.email ? data.email.trim().toLowerCase() : null) : currentStaff.email,
      phone: data.phone !== undefined ? (data.phone ? data.phone.trim() : null) : currentStaff.phone,
      designation: data.designation !== undefined ? (data.designation ? data.designation.trim() : null) : currentStaff.designation,
      department: data.department !== undefined ? (data.department ? data.department.trim() : null) : currentStaff.department,
      joiningDate: data.joiningDate !== undefined ? (data.joiningDate ? new Date(data.joiningDate) : null) : currentStaff.joiningDate,
      employmentStatus: data.employmentStatus !== undefined ? (data.employmentStatus as any) : currentStaff.employmentStatus,
      updatedAt: new Date(),
    };

    if (prisma) {
      try {
        const updated = await prisma.staff.update({
          where: { id: currentStaff.id },
          data: updatedData,
        });

        // Update in memory store as well
        const idx = store.staff.findIndex((s) => s.id === currentStaff.id || s.staffId === currentStaff.staffId);
        if (idx !== -1) {
          store.staff[idx] = {
            ...updated,
            joiningDate: updated.joiningDate ? updated.joiningDate.toISOString() : null,
          };
        }

        return res.json({ success: true, data: updated });
      } catch (dbErr) {
        logger.warn({ err: dbErr }, 'DB update failed, updating memory store');
      }
    }

    // Memory update
    const idx = store.staff.findIndex((s) => s.id === currentStaff.id || s.staffId === currentStaff.staffId);
    if (idx !== -1) {
      store.staff[idx] = {
        ...store.staff[idx],
        ...updatedData,
        joiningDate: updatedData.joiningDate ? updatedData.joiningDate.toISOString() : null,
        updatedAt: updatedData.updatedAt.toISOString(),
      };
      return res.json({ success: true, data: store.staff[idx] });
    }

    return res.json({ success: true, data: { ...currentStaff, ...updatedData } });
  } catch (err: any) {
    logger.error({ err }, 'Error updating staff member');
    return res.status(500).json({ success: false, error: err.message || 'Failed to update staff member' });
  }
});

// DELETE /api/staff/:id (Deactivate or delete staff member - Admin only)
router.delete('/staff/:id', authenticate, requireRole('ADMIN'), async (req: Request, res: Response) => {
  const { id } = req.params;
  const isHardDelete = req.query.hard === 'true';

  try {
    const prisma = getPrisma();
    let currentStaff: any = null;

    if (prisma) {
      try {
        currentStaff = await prisma.staff.findFirst({
          where: { OR: [{ id }, { staffId: id }] },
        });
      } catch (dbErr) {
        currentStaff = store.staff.find((s) => s.id === id || s.staffId === id);
      }
    } else {
      currentStaff = store.staff.find((s) => s.id === id || s.staffId === id);
    }

    if (!currentStaff) {
      return res.status(404).json({ success: false, error: 'Staff member not found' });
    }

    if (isHardDelete) {
      if (prisma) {
        try {
          await prisma.staff.delete({ where: { id: currentStaff.id } });
        } catch (e) {
          // ignore
        }
      }
      store.staff = store.staff.filter((s) => s.id !== currentStaff.id && s.staffId !== currentStaff.staffId);
      return res.json({ success: true, message: `Staff member ${currentStaff.staffId} permanently deleted` });
    } else {
      // Soft deactivate
      if (prisma) {
        try {
          await prisma.staff.update({
            where: { id: currentStaff.id },
            data: { employmentStatus: 'INACTIVE', updatedAt: new Date() },
          });
        } catch (e) {
          // ignore
        }
      }
      const idx = store.staff.findIndex((s) => s.id === currentStaff.id || s.staffId === currentStaff.staffId);
      if (idx !== -1) {
        store.staff[idx].employmentStatus = 'INACTIVE';
        store.staff[idx].updatedAt = new Date().toISOString();
      }
      return res.json({
        success: true,
        message: `Staff member ${currentStaff.staffId} deactivated successfully`,
        data: { ...currentStaff, employmentStatus: 'INACTIVE' },
      });
    }
  } catch (err: any) {
    logger.error({ err }, 'Error deactivating staff member');
    return res.status(500).json({ success: false, error: err.message || 'Failed to deactivate staff member' });
  }
});

export default router;

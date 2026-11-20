// ─────────────────────────────────────────────────────────────────────────────
// TEAM B Coaching Institute – Central API client
// Seamlessly communicates with backend API, or serves demo data if unreachable
// ─────────────────────────────────────────────────────────────────────────────

import { DEMO_DATA } from './demoData.js';

// Track whether the backend is reachable so we can warn the user once
let backendUnreachable = false;
export function isBackendUnreachable() {
  return backendUnreachable;
}

export function getApiBaseUrl(): string {
  if (typeof window !== 'undefined') {
    const custom = localStorage.getItem('teamb_api_url');
    if (custom !== null) return custom;
  }
  return ((import.meta.env.VITE_API_URL as string) || '').trim().replace(/\/+$/, '');
}

export function setApiBaseUrl(url: string) {
  if (typeof window !== 'undefined') {
    localStorage.setItem('teamb_api_url', url.trim().replace(/\/+$/, ''));
  }
}

export function resetApiBaseUrl() {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('teamb_api_url');
  }
}

export async function fetchApi<T = any>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token = localStorage.getItem('teamb_token');

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const customApiUrl = typeof window !== 'undefined' ? localStorage.getItem('teamb_api_url') : null;
  let apiBase = (customApiUrl !== null ? customApiUrl : (import.meta.env.VITE_API_URL as string) || '').trim().replace(/\/+$/, '');
  let normalizedEndpoint = endpoint;

  if (apiBase && apiBase.endsWith('/api') && normalizedEndpoint.startsWith('/api/')) {
    normalizedEndpoint = normalizedEndpoint.slice(4);
  }

  const apiEndpoint =
    apiBase && normalizedEndpoint.startsWith('/')
      ? `${apiBase}${normalizedEndpoint}`
      : normalizedEndpoint;

  let res: Response;
  try {
    res = await fetch(apiEndpoint, {
      ...options,
      headers,
      credentials: 'include',
    });

    // Backend is reachable
    backendUnreachable = false;

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      const errorMsg = data.error || `HTTP error ${res.status}`;
      const err = new Error(errorMsg);
      (err as any).details = data.details;
      (err as any).status = res.status;
      throw err;
    }

    return data;
  } catch (netErr: any) {
    // ── Network / CORS failure ──────────────────────────────────────────────
    const isNetworkError =
      netErr?.name === 'TypeError' ||
      netErr?.message?.toLowerCase().includes('fetch') ||
      netErr?.message?.toLowerCase().includes('failed') ||
      netErr?.message?.toLowerCase().includes('network') ||
      netErr?.message?.toLowerCase().includes('err_') ||
      netErr?.message?.toLowerCase().includes('econnrefused');

    if (isNetworkError) {
      backendUnreachable = true;

      // Always try Demo-Data fallback
      const demoResult = getDemoFallback(normalizedEndpoint || endpoint, options);
      if (demoResult !== null) {
        console.warn(
          `[DEMO MODE] Backend unreachable. Serving in-memory demo data for: ${endpoint}`
        );
        return demoResult as T;
      }

      const destination = apiBase || window.location.origin;
      throw new Error(
        `Unable to reach API server at ${destination}. ` +
          `The backend service may be spinning up (Render free tier sleeps after 15 min inactivity). ` +
          `Please wait 30–60 seconds and retry, or use Demo Mode to explore the app offline.`
      );
    }

    throw netErr;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Demo-data fallback: matches API endpoint patterns and returns demo payloads
// ─────────────────────────────────────────────────────────────────────────────
function getDemoFallback(endpoint: string, options: RequestInit = {}): any {
  const [pathname, queryString] = endpoint.split('?');
  const params = new URLSearchParams(queryString || '');

  // Auth Login Fallback
  if (pathname === '/api/auth/login' || pathname === '/auth/login') {
    let email = 'admin@teamb.edu';
    try {
      const body = options.body ? JSON.parse(String(options.body)) : {};
      if (body.email) email = body.email;
    } catch {}
    const demoAccounts: Record<string, { role: string; name: string }> = {
      'admin@teamb.edu': { role: 'ADMIN', name: 'Dr. Vikram Sharma (Director)' },
      'counsellor.priya@teamb.edu': { role: 'ADMISSIONS_COUNSELLOR', name: 'Priya Sen (Lead Counsellor)' },
      'counsellor.arjun@teamb.edu': { role: 'ADMISSIONS_COUNSELLOR', name: 'Arjun Mehta (Counsellor)' },
      'counsellor.neha@teamb.edu': { role: 'ADMISSIONS_COUNSELLOR', name: 'Neha Gupta (Counsellor)' },
      'coordinator.rahul@teamb.edu': { role: 'ACADEMIC_COORDINATOR', name: 'Rahul Nair (Academic Head)' },
      'teacher.anita@teamb.edu': { role: 'TEACHER', name: 'Anita Desai (Senior Physics Faculty)' },
    };
    const norm = email.toLowerCase().trim();
    const demoUser = demoAccounts[norm] || { role: 'ADMIN', name: 'Dr. Vikram Sharma (Director)' };
    const user = {
      id: `demo-${demoUser.role.toLowerCase()}`,
      email: norm,
      name: demoUser.name,
      role: demoUser.role,
    };
    return {
      success: true,
      user,
      token: 'demo-offline-token',
      isDemoMode: true,
    };
  }

  // Leads list & POST
  if (pathname === '/api/leads' || pathname === '/leads') {
    if (options.method === 'POST') {
      try {
        const body = options.body ? JSON.parse(String(options.body)) : {};
        const newLead = {
          id: `lead-demo-${Date.now()}`,
          studentName: body.studentName || 'Sample Lead',
          email: body.email || 'lead@example.com',
          phone: body.phone || '+919876543210',
          courseInterest: body.courseInterest || 'JEE Advanced FastTrack',
          source: body.source || 'WEB_FORM',
          stage: 'New',
          score: 80,
          scoreCategory: 'HOT',
          assignedCounsellorId: 'c-priya-01',
          communicationConsent: true,
          optedOut: false,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        (DEMO_DATA.leads as any[]).unshift(newLead);
        return { success: true, lead: newLead, isDuplicate: false };
      } catch {
        return { success: true, lead: DEMO_DATA.leads[0], isDuplicate: false };
      }
    }

    let leads = [...DEMO_DATA.leads];
    const search = params.get('search')?.toLowerCase();
    const stage = params.get('stage');
    const scoreCategory = params.get('scoreCategory');

    if (search) {
      leads = leads.filter(
        (l) =>
          l.studentName.toLowerCase().includes(search) ||
          l.email.toLowerCase().includes(search) ||
          l.phone.includes(search) ||
          l.courseInterest.toLowerCase().includes(search)
      );
    }
    if (stage) leads = leads.filter((l) => l.stage === stage);
    if (scoreCategory) leads = leads.filter((l) => l.scoreCategory === scoreCategory);

    return { success: true, leads, total: leads.length };
  }

  // Lead detail
  if (pathname.match(/^\/api\/leads\/[^/]+$/) || pathname.match(/^\/leads\/[^/]+$/)) {
    const id = pathname.split('/').pop();
    const lead = DEMO_DATA.leads.find((l: any) => l.id === id) || DEMO_DATA.leads[0];
    return { success: true, lead };
  }

  // Lead Conversion Fallback
  if (pathname.match(/\/api\/leads\/[^/]+\/convert|\/leads\/[^/]+\/convert/)) {
    const parts = pathname.split('/');
    const id = parts[parts.length - 2];
    const lead = DEMO_DATA.leads.find((l: any) => l.id === id) || DEMO_DATA.leads[0];
    const count = (DEMO_DATA as any).students?.length || 100;
    const studentIdNumber = `STU${String(count + 1).padStart(3, '0')}`;
    const newStudent = {
      id: `stu-${studentIdNumber.toLowerCase()}`,
      studentIdNumber,
      studentId: studentIdNumber,
      name: lead.studentName,
      fullName: lead.studentName,
      email: lead.email,
      phone: lead.phone,
      courseId: 'course-java-fs',
      courseName: lead.courseInterest || 'Java Full Stack',
      admissionDate: new Date().toISOString(),
      feeStatus: 'PENDING',
      studentStatus: 'ACTIVE',
      enrollmentStatus: 'ACTIVE',
      convertedFromLeadId: lead.id,
      isDemoData: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    lead.stage = 'Enrolled';
    (lead as any).convertedToStudentId = newStudent.id;
    if ((DEMO_DATA as any).students) {
      (DEMO_DATA as any).students.unshift(newStudent);
    }
    return {
      success: true,
      message: 'Lead converted to student record successfully',
      student: newStudent,
      lead,
    };
  }

  // Staff Stats
  if (pathname === '/api/staff/stats' || pathname === '/staff/stats') {
    return { success: true, data: DEMO_DATA.staffStats };
  }

  // Staff List & POST
  if (pathname === '/api/staff' || pathname === '/staff') {
    if (options.method === 'POST') {
      try {
        const body = options.body ? JSON.parse(String(options.body)) : {};
        const newStaff = {
          id: `staff-${Date.now()}`,
          staffId: body.staffId || `STF${String(DEMO_DATA.staff.length + 1).padStart(3, '0')}`,
          fullName: body.fullName || 'New Staff',
          email: body.email || null,
          phone: body.phone || null,
          designation: body.designation || null,
          department: body.department || null,
          joiningDate: body.joiningDate || null,
          employmentStatus: body.employmentStatus || 'ACTIVE',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        DEMO_DATA.staff.push(newStaff);
        return { success: true, data: newStaff };
      } catch {
        return { success: true, data: DEMO_DATA.staff[0] };
      }
    }

    let staff = [...DEMO_DATA.staff];
    const search = params.get('search')?.toLowerCase();
    const department = params.get('department');
    const status = params.get('status');

    if (search) {
      staff = staff.filter(
        (s: any) =>
          (s.fullName && String(s.fullName).toLowerCase().includes(search)) ||
          (s.email && String(s.email).toLowerCase().includes(search)) ||
          (s.staffId && String(s.staffId).toLowerCase().includes(search))
      );
    }
    if (department) staff = staff.filter((s: any) => s.department === department);
    if (status) staff = staff.filter((s: any) => s.employmentStatus === status);

    return { success: true, count: staff.length, data: staff };
  }

  // Individual staff member
  if (pathname.match(/^\/api\/staff\/[^/]+$/) || pathname.match(/^\/staff\/[^/]+$/)) {
    const id = pathname.split('/').pop();
    const member = DEMO_DATA.staff.find((s: any) => s.id === id || s.staffId === id);
    return member ? { success: true, data: member } : null;
  }

  // Dashboard
  if (pathname.match(/\/api\/dashboard|\/dashboard/)) {
    return { success: true, ...DEMO_DATA.dashboard };
  }

  // Courses
  if (pathname === '/api/courses' || pathname === '/courses') {
    return { success: true, courses: (DEMO_DATA as any).courses || [] };
  }

  // Student Stats
  if (pathname === '/api/students/stats' || pathname === '/students/stats') {
    return { success: true, stats: (DEMO_DATA as any).studentStats };
  }

  // Students list & POST
  if (pathname === '/api/students' || pathname === '/students') {
    if (options.method === 'POST') {
      try {
        const body = options.body ? JSON.parse(String(options.body)) : {};
        const count = DEMO_DATA.students.length;
        const studentId = `STU${String(count + 1).padStart(3, '0')}`;
        const newStudent = {
          id: `stu-${studentId.toLowerCase()}`,
          studentId,
          studentIdNumber: studentId,
          fullName: body.fullName || body.name || 'New Student',
          name: body.fullName || body.name || 'New Student',
          email: body.email || `${studentId.toLowerCase()}@example.com`,
          phone: body.phone || null,
          courseId: body.courseId || null,
          courseName: body.courseName || 'Java Full Stack',
          admissionDate: body.admissionDate || new Date().toISOString(),
          feeStatus: body.feeStatus || 'PENDING',
          studentStatus: body.studentStatus || 'ACTIVE',
          enrollmentStatus: body.studentStatus || 'ACTIVE',
          isDemoData: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        (DEMO_DATA.students as any[]).unshift(newStudent);
        return { success: true, student: newStudent, message: 'Student created successfully' };
      } catch {
        return { success: true, student: DEMO_DATA.students[0] };
      }
    }

    let students = [...DEMO_DATA.students];
    const page = Math.max(1, parseInt(params.get('page') || '1', 10));
    const limit = Math.max(1, Math.min(100, parseInt(params.get('limit') || '10', 10)));
    const search = params.get('search')?.toLowerCase().trim();
    const course = params.get('courseId') || params.get('course');
    const feeStatus = params.get('feeStatus');
    const studentStatus = params.get('studentStatus');

    if (search) {
      students = students.filter(
        (s: any) =>
          (s.name && s.name.toLowerCase().includes(search)) ||
          (s.studentIdNumber && s.studentIdNumber.toLowerCase().includes(search)) ||
          (s.email && s.email.toLowerCase().includes(search)) ||
          (s.courseName && s.courseName.toLowerCase().includes(search))
      );
    }

    if (course) {
      students = students.filter(
        (s: any) => s.courseId === course || (s.courseName && s.courseName.toLowerCase() === course.toLowerCase())
      );
    }

    if (feeStatus) {
      students = students.filter((s: any) => s.feeStatus === feeStatus);
    }

    if (studentStatus) {
      students = students.filter((s: any) => s.studentStatus === studentStatus);
    }

    const total = students.length;
    const paginated = students.slice((page - 1) * limit, page * limit);

    return {
      success: true,
      students: paginated,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }

  // Single student detail & PUT
  if (pathname.match(/^\/api\/students\/[^/]+$/) || pathname.match(/^\/students\/[^/]+$/)) {
    const id = pathname.split('/').pop();
    if (options.method === 'PUT') {
      try {
        const body = options.body ? JSON.parse(String(options.body)) : {};
        const idx = DEMO_DATA.students.findIndex((s: any) => s.id === id || s.studentIdNumber === id || s.studentId === id);
        if (idx !== -1) {
          (DEMO_DATA.students as any)[idx] = { ...(DEMO_DATA.students as any)[idx], ...body, updatedAt: new Date().toISOString() };
          return { success: true, student: DEMO_DATA.students[idx], message: 'Student updated successfully' };
        }
      } catch {}
    }
    const student = DEMO_DATA.students.find((s: any) => s.id === id || s.studentIdNumber === id || s.studentId === id) || DEMO_DATA.students[0];
    return { success: true, student };
  }

  // Counsellors
  if (pathname.match(/\/api\/counsellors|\/counsellors/)) {
    return { success: true, counsellors: DEMO_DATA.counsellors };
  }

  // Follow-ups
  if (pathname.match(/\/api\/follow-ups|\/follow-ups/)) {
    return { success: true, tasks: [], total: 0 };
  }

  // Admissions Analytics
  if (pathname.match(/\/api\/admissions\/analytics|\/admissions\/analytics/)) {
    return { success: true, ...DEMO_DATA.admissionsAnalytics };
  }

  // Academic Analytics
  if (pathname.match(/\/api\/academic\/analytics|\/academic\/analytics/)) {
    return {
      success: true,
      metrics: {
        overallAttendancePercentage: 86.4,
        atRiskAlertCount: 2,
        classWise: [
          { classCode: 'BATCH-JEE-A', className: 'JEE Alpha Batch (Morning)', attendancePercentage: 88.5 },
          { classCode: 'BATCH-NEET-B', className: 'NEET Pinnacle Batch', attendancePercentage: 84.2 },
          { classCode: 'BATCH-FND-C', className: 'Foundation Achievers', attendancePercentage: 87.1 },
          { classCode: 'BATCH-JAVA-A', className: 'Java Full Stack Morning Batch', attendancePercentage: 85.0 },
          { classCode: 'BATCH-PY-B', className: 'Python Full Stack Evening Batch', attendancePercentage: 86.8 },
        ],
      },
    };
  }

  // Health check
  if (pathname.match(/\/api\/health|\/health/)) {
    return {
      status: 'DEMO_MODE',
      service: 'TEAM B Coaching Institute API (Offline Demo)',
      timestamp: new Date().toISOString(),
      demoMode: true,
      storage: { mode: 'in-memory-demo', persistent: false },
    };
  }

  // Auth Me
  if (pathname.match(/\/api\/auth\/me|\/auth\/me/)) {
    try {
      const saved = localStorage.getItem('teamb_user');
      if (saved) {
        const user = JSON.parse(saved);
        return { success: true, user };
      }
    } catch {}
  }

  if (pathname.match(/\/api\/at-risk|\/at-risk/)) {
    return { success: true, flags: [], total: 0 };
  }
  if (pathname.match(/\/api\/tasks|\/tasks/)) {
    return { success: true, tasks: [], total: 0 };
  }
  if (pathname.match(/\/api\/communications|\/communications/)) {
    return { success: true, messages: [], total: 0 };
  }
  if (pathname.match(/\/api\/automation\/runs|\/automation\/runs/)) {
    return { success: true, runs: [], total: 0 };
  }
  if (pathname.match(/\/api\/audit-logs|\/audit-logs/)) {
    return { success: true, logs: [], total: 0 };
  }
  if (pathname.match(/\/api\/settings|\/settings/)) {
    return { success: true, settings: DEMO_DATA.settings };
  }
  return null;
}

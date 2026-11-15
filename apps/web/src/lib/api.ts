// ─────────────────────────────────────────────────────────────────────────────
// TEAM B Coaching Institute – Central API client
// Falls back to in-memory demo data when the backend is unreachable.
// ─────────────────────────────────────────────────────────────────────────────

import { DEMO_DATA } from './demoData.js';

// Track whether the backend is reachable so we can warn the user once
let backendUnreachable = false;
export function isBackendUnreachable() { return backendUnreachable; }

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

  let apiBase = ((import.meta.env.VITE_API_URL as string) || '').trim().replace(/\/+$/, '');
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
    // ── Network / CORS failure ────────────────────────────────────────────────
    const isNetworkError =
      netErr?.name === 'TypeError' &&
      (netErr?.message?.toLowerCase().includes('fetch') ||
        netErr?.message?.toLowerCase().includes('failed'));

    if (isNetworkError) {
      backendUnreachable = true;

      // ── Try Demo-Data fallback for GET requests ───────────────────────────
      if (!options.method || options.method === 'GET') {
        const demoResult = getDemoFallback(normalizedEndpoint || endpoint);
        if (demoResult !== null) {
          console.warn(
            `[DEMO MODE] Backend unreachable. Serving in-memory demo data for: ${endpoint}`
          );
          return demoResult as T;
        }
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
function getDemoFallback(endpoint: string): any {
  if (endpoint.match(/^\/api\/leads$/) || endpoint.match(/^\/leads$/)) {
    return { success: true, leads: DEMO_DATA.leads, total: DEMO_DATA.leads.length };
  }
  if (endpoint.match(/^\/api\/leads\/[^/]+$/) || endpoint.match(/^\/leads\/[^/]+$/)) {
    const id = endpoint.split('/').pop();
    const lead = DEMO_DATA.leads.find((l: any) => l.id === id) || DEMO_DATA.leads[0];
    return { success: true, lead };
  }
  if (endpoint.match(/^\/api\/staff\/stats$/) || endpoint.match(/^\/staff\/stats$/)) {
    return { success: true, data: DEMO_DATA.staffStats };
  }
  if (endpoint.match(/^\/api\/staff$/) || endpoint.match(/^\/staff$/)) {
    return { success: true, count: DEMO_DATA.staff.length, data: DEMO_DATA.staff };
  }
  if (endpoint.match(/^\/api\/staff\/[^/]+$/) || endpoint.match(/^\/staff\/[^/]+$/)) {
    const id = endpoint.split('/').pop();
    const member = DEMO_DATA.staff.find((s: any) => s.id === id || s.staffId === id);
    return member ? { success: true, data: member } : null;
  }
  if (endpoint.match(/\/api\/dashboard|\/dashboard/)) {
    return { success: true, ...DEMO_DATA.dashboard };
  }
  if (endpoint.match(/\/api\/students|\/students/)) {
    return { success: true, students: DEMO_DATA.students, total: DEMO_DATA.students.length };
  }
  if (endpoint.match(/\/api\/counsellors|\/counsellors/)) {
    return { success: true, counsellors: DEMO_DATA.counsellors };
  }
  if (endpoint.match(/\/api\/follow-ups|\/follow-ups/)) {
    return { success: true, tasks: [], total: 0 };
  }
  if (endpoint.match(/\/api\/admissions\/analytics|\/admissions\/analytics/)) {
    return { success: true, ...DEMO_DATA.admissionsAnalytics };
  }
  if (endpoint.match(/\/api\/health|\/health/)) {
    return {
      status: 'DEMO_MODE',
      service: 'TEAM B Coaching Institute API (Offline Demo)',
      timestamp: new Date().toISOString(),
      demoMode: true,
      storage: { mode: 'in-memory-demo', persistent: false },
    };
  }
  if (endpoint.match(/\/api\/auth\/me|\/auth\/me/)) {
    // If we have a saved user in localStorage, return it without hitting the backend
    try {
      const saved = localStorage.getItem('teamb_user');
      if (saved) {
        const user = JSON.parse(saved);
        return { success: true, user };
      }
    } catch {}
  }
  if (endpoint.match(/\/api\/at-risk|\/at-risk/)) {
    return { success: true, flags: [], total: 0 };
  }
  if (endpoint.match(/\/api\/tasks|\/tasks/)) {
    return { success: true, tasks: [], total: 0 };
  }
  if (endpoint.match(/\/api\/communications|\/communications/)) {
    return { success: true, messages: [], total: 0 };
  }
  if (endpoint.match(/\/api\/automation\/runs|\/automation\/runs/)) {
    return { success: true, runs: [], total: 0 };
  }
  if (endpoint.match(/\/api\/audit-logs|\/audit-logs/)) {
    return { success: true, logs: [], total: 0 };
  }
  if (endpoint.match(/\/api\/settings|\/settings/)) {
    return { success: true, settings: DEMO_DATA.settings };
  }
  return null;
}

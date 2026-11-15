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

  const apiBase = (import.meta.env.VITE_API_URL || '').replace(/\/+$/, '');
  const apiEndpoint = apiBase && endpoint.startsWith('/') ? `${apiBase}${endpoint}` : endpoint;

  const res = await fetch(apiEndpoint, {
    ...options,
    headers,
    credentials: 'include',
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    const errorMsg = data.error || `HTTP error ${res.status}`;
    const err = new Error(errorMsg);
    (err as any).details = data.details;
    (err as any).status = res.status;
    throw err;
  }

  return data;
}

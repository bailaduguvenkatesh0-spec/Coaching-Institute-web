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

  const apiEndpoint = apiBase && normalizedEndpoint.startsWith('/')
    ? `${apiBase}${normalizedEndpoint}`
    : normalizedEndpoint;

  let res: Response;
  try {
    res = await fetch(apiEndpoint, {
      ...options,
      headers,
      credentials: 'include',
    });
  } catch (netErr: any) {
    const isNetworkOrCors = netErr?.name === 'TypeError' && netErr?.message?.includes('fetch');
    if (isNetworkOrCors) {
      const destination = apiBase || window.location.origin;
      throw new Error(
        `Unable to reach API server at ${destination}. ` +
        `The backend service may be spinning up, offline, or rejecting requests. ` +
        `Verify the backend is live at ${destination}/api/health.`
      );
    }
    throw netErr;
  }

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

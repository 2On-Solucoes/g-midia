// Por defeito a API é a mesma origem (rotas /api/v1 do próprio Next.js).
// Define NEXT_PUBLIC_API_BASE_URL apenas se usares o backend Python em separado.
const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? '';

export function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('gmidia_token');
}

export function setTokens(access: string, refresh: string) {
  localStorage.setItem('gmidia_token', access);
  localStorage.setItem('gmidia_refresh', refresh);
}

export function clearTokens() {
  localStorage.removeItem('gmidia_token');
  localStorage.removeItem('gmidia_refresh');
  localStorage.removeItem('gmidia_user');
}

export function getUser(): any | null {
  if (typeof window === 'undefined') return null;
  const raw = localStorage.getItem('gmidia_user');
  return raw ? JSON.parse(raw) : null;
}

export function setUser(user: any) {
  localStorage.setItem('gmidia_user', JSON.stringify(user));
}

export async function api<T = any>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {}),
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
  });

  if (res.status === 401) {
    clearTokens();
    if (typeof window !== 'undefined' && !window.location.pathname.startsWith('/login')) {
      window.location.href = '/login';
    }
    throw new Error('Não autenticado');
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.detail || `Erro ${res.status}`);
  }

  if (res.status === 204) return undefined as T;
  return res.json();
}

export const authApi = {
  register: (data: { email: string; full_name: string; password: string }) =>
    api('/api/v1/auth/register', { method: 'POST', body: JSON.stringify(data) }),
  login: (data: { email: string; password: string }) =>
    api('/api/v1/auth/login', { method: 'POST', body: JSON.stringify(data) }),
  me: () => api('/api/v1/auth/me'),
};

export const dashboardApi = {
  summary: () => api('/api/v1/dashboard/summary'),
};

export const postsApi = {
  list: (status?: string) =>
    api(`/api/v1/posts${status ? `?status=${status}` : ''}`),
  create: (data: any) =>
    api('/api/v1/posts', { method: 'POST', body: JSON.stringify(data) }),
  publish: (id: number) =>
    api(`/api/v1/posts/${id}/publish`, { method: 'POST' }),
  remove: (id: number) =>
    api(`/api/v1/posts/${id}`, { method: 'DELETE' }),
};

export const pagesApi = {
  list: () => api('/api/v1/pages'),
  connectDemo: (data: { name: string; category?: string; followers_count?: number }) =>
    api('/api/v1/pages/connect-demo', { method: 'POST', body: JSON.stringify(data) }),
  disconnect: (id: number) =>
    api(`/api/v1/pages/${id}`, { method: 'DELETE' }),
  metaStatus: () => api('/api/v1/pages/meta/status'),
};

export const aiApi = {
  generate: (data: { prompt: string; tone?: string; language?: string; max_length?: number }) =>
    api('/api/v1/ai/generate', { method: 'POST', body: JSON.stringify(data) }),
};

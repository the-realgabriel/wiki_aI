const API_BASE = (import.meta.env.VITE_API_URL ?? '').replace(/\/+$/g, '');

export type User = {
  id: string;
  email: string;
  role: string;
};

export type AuthResponse = {
  user: User;
  access_token: string;
  refresh_token: string;
  expires_in: number;
  token_type: string;
};

let accessToken: string | null = null;

function buildApiUrl(path: string) {
  if (/^https?:\/\//i.test(path)) {
    return path;
  }
  return API_BASE ? `${API_BASE}${path}` : path;
}

function isAllowedOrigin(url: string): boolean {
  if (!url.startsWith('http')) return true;
  try {
    const target = new URL(url);
    const current = new URL(window.location.origin);
    return target.origin === current.origin;
  } catch {
    return false;
  }
}

function storeAuth(data: AuthResponse) {
  accessToken = data.access_token;
  localStorage.setItem('access_token', data.access_token);
  localStorage.setItem('refresh_token', data.refresh_token);
  localStorage.setItem('user', JSON.stringify(data.user));
}

function clearAuth() {
  accessToken = null;
  localStorage.removeItem('access_token');
  localStorage.removeItem('refresh_token');
  localStorage.removeItem('user');
}

export function getStoredUser(): User | null {
  const raw = localStorage.getItem('user');
  return raw ? JSON.parse(raw) : null;
}

export function getAccessToken(): string | null {
  return accessToken;
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getAccessToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };
  const url = buildApiUrl(path);
  if (token && isAllowedOrigin(url)) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(url, { ...options, headers });

  if (res.status === 401) {
    const refreshed = await tryRefresh();
    if (refreshed) {
      headers['Authorization'] = `Bearer ${getAccessToken()}`;
      const retry = await fetch(url, { ...options, headers });
      if (!retry.ok) {
        const err = await retry.json().catch(() => ({ error: 'Request failed' }));
        throw new Error(err.error);
      }
      return retry.json();
    }
    clearAuth();
    window.location.href = '/login';
    throw new Error('Session expired');
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(err.error);
  }

  return res.json();
}

async function tryRefresh(): Promise<boolean> {
  const refreshToken = localStorage.getItem('refresh_token');
  if (!refreshToken) return false;

  try {
    const res = await fetch(buildApiUrl('/auth/refresh'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh_token: refreshToken }),
    });
    if (!res.ok) return false;
    const data: AuthResponse = await res.json();
    storeAuth(data);
    return true;
  } catch {
    return false;
  }
}

export async function signUp(email: string, password: string, name: string): Promise<AuthResponse> {
  const res = await fetch(buildApiUrl('/auth/signup'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, name }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Signup failed' }));
    throw new Error(err.error);
  }
  const data: AuthResponse = await res.json();
  storeAuth(data);
  return data;
}

export async function signIn(email: string, password: string): Promise<AuthResponse> {
  const res = await fetch(buildApiUrl('/auth/signin'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Sign in failed' }));
    throw new Error(err.error);
  }
  const data: AuthResponse = await res.json();
  storeAuth(data);
  return data;
}

export async function signOut(): Promise<void> {
  const refreshToken = localStorage.getItem('refresh_token');
  try {
    await fetch(buildApiUrl('/auth/signout'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh_token: refreshToken }),
    });
  } catch {
    // ignore
  }
  clearAuth();
}

export async function getMe(): Promise<User> {
  const stored = getStoredUser();
  if (stored && !getAccessToken()) {
    const refreshed = await tryRefresh();
    if (refreshed) {
      return request<User>('/auth/me');
    }
    clearAuth();
    throw new Error('Session expired');
  }
  return request<User>('/auth/me');
}

export function initAuth() {
  const stored = getStoredUser();
  if (stored) {
    accessToken = localStorage.getItem('access_token');
  }
}

initAuth();

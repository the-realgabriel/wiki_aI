import { getAccessToken } from './auth';

const API_BASE = import.meta.env.VITE_API_URL ?? '';

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

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getAccessToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };
  const url = `${API_BASE}${path}`;
  if (token && isAllowedOrigin(url)) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(url, { ...options, headers });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(err.error);
  }

  return res.json();
}

export async function getRows(table: string, params: Record<string, string> = {}) {
  const qs = new URLSearchParams(params).toString();
  return request<any[]>(`/rest/v1/${table}${qs ? `?${qs}` : ''}`);
}

export async function getRow(table: string, id: string) {
  return request<any>(`/rest/v1/${table}/${id}`);
}

export async function insertRow(table: string, body: Record<string, unknown>) {
  return request<any>(`/rest/v1/${table}`, {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export async function updateRow(table: string, id: string, body: Record<string, unknown>) {
  return request<any>(`/rest/v1/${table}/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  });
}

export async function deleteRow(table: string, id: string) {
  return request<any>(`/rest/v1/${table}/${id}`, {
    method: 'DELETE',
  });
}

const API_BASE = import.meta.env.VITE_API_URL ?? '';

export type WikiPage = {
  slug: string;
  title: string;
  tags: string[];
  content: string;
  created_at?: string;
  updated_at?: string;
};

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const url = `${API_BASE}${path}`;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };
  const res = await fetch(url, { ...options, headers });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(err.error);
  }
  return res.json();
}

export async function fetchPages(params: Record<string, string> = {}): Promise<WikiPage[]> {
  const qs = new URLSearchParams(params).toString();
  return request<WikiPage[]>(`/api/pages${qs ? `?${qs}` : ''}`);
}

export async function fetchPage(slug: string): Promise<WikiPage> {
  return request<WikiPage>(`/api/pages/${encodeURIComponent(slug)}`);
}

export async function searchPages(query: string): Promise<WikiPage[]> {
  const qs = new URLSearchParams({ q: query }).toString();
  return request<WikiPage[]>(`/api/pages/search?${qs}`);
}

export async function createPage(page: { slug: string; title: string; content?: string; tags?: string[] }): Promise<WikiPage> {
  return request<WikiPage>('/api/pages', {
    method: 'POST',
    body: JSON.stringify(page),
  });
}

export async function updatePage(slug: string, data: Partial<WikiPage>): Promise<WikiPage> {
  return request<WikiPage>(`/api/pages/${encodeURIComponent(slug)}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export async function deletePage(slug: string): Promise<void> {
  await request(`/api/pages/${encodeURIComponent(slug)}`, { method: 'DELETE' });
}

export type FileSearchResult = {
  path: string;
  name: string;
  content: string;
};

export async function searchFiles(query: string): Promise<FileSearchResult[]> {
  const qs = new URLSearchParams({ q: query }).toString();
  return request<FileSearchResult[]>(`/api/files/search?${qs}`);
}

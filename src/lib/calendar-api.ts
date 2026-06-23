const API_BASE = import.meta.env.VITE_API_URL ?? '';

export type CalendarEvent = {
  id?: string
  date: string
  title: string
  type: "meeting" | "deadline" | "milestone"
  description?: string
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const url = `${API_BASE}${path}`
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  }
  const res = await fetch(url, { ...options, headers })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Request failed' }))
    throw new Error(err.error)
  }
  return res.json()
}

export async function fetchEvents(params: Record<string, string> = {}): Promise<CalendarEvent[]> {
  const qs = new URLSearchParams(params).toString()
  return request<CalendarEvent[]>(`/api/events${qs ? `?${qs}` : ''}`)
}

export async function createEvent(event: Omit<CalendarEvent, "id">): Promise<CalendarEvent> {
  return request<CalendarEvent>('/api/events', {
    method: 'POST',
    body: JSON.stringify(event),
  })
}

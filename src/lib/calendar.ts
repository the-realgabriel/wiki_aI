import { getRows, insertRow } from './rest'

export type CalendarEvent = {
  id?: string
  date: string
  title: string
  type: "meeting" | "deadline" | "milestone"
  description?: string
}

export type CalendarDay = {
  date: Date
  day: number
  isCurrentMonth: boolean
  isToday: boolean
  events: CalendarEvent[]
}

export async function fetchEvents(): Promise<CalendarEvent[]> {
  const rows = await getRows("calendar_events", { order: "date.asc" })
  return rows.map((r: any) => ({
    id: r.id,
    date: r.date,
    title: r.title,
    type: r.type,
    description: r.description,
  }))
}

export async function createEvent(event: Omit<CalendarEvent, "id">): Promise<CalendarEvent> {
  const row = await insertRow("calendar_events", event as any)
  return { id: row.id, ...event }
}

export function getMonthDays(year: number, month: number): CalendarDay[][] {
  const today = new Date()
  const firstDay = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const daysInPrev = new Date(year, month, 0).getDate()

  const weeks: CalendarDay[][] = []
  let week: CalendarDay[] = []

  for (let p = firstDay - 1; p >= 0; p--) {
    week.push({
      date: new Date(year, month - 1, daysInPrev - p),
      day: daysInPrev - p,
      isCurrentMonth: false,
      isToday: false,
      events: [],
    })
  }

  for (let d = 1; d <= daysInMonth; d++) {
    const date = new Date(year, month, d)
    week.push({
      date,
      day: d,
      isCurrentMonth: true,
      isToday:
        today.getFullYear() === year &&
        today.getMonth() === month &&
        today.getDate() === d,
      events: [],
    })
    if (week.length === 7) {
      weeks.push(week)
      week = []
    }
  }

  if (week.length > 0) {
    let next = 1
    while (week.length < 7) {
      week.push({
        date: new Date(year, month + 1, next),
        day: next,
        isCurrentMonth: false,
        isToday: false,
        events: [],
      })
      next++
    }
    weeks.push(week)
  }

  return weeks
}

export function assignEventsToDays(
  weeks: CalendarDay[][],
  events: CalendarEvent[]
): CalendarDay[][] {
  const dateStr = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`

  const map = new Map<string, CalendarEvent[]>()
  for (const ev of events) {
    const key = ev.date
    if (!map.has(key)) map.set(key, [])
    map.get(key)!.push(ev)
  }

  return weeks.map((week) =>
    week.map((day) => ({
      ...day,
      events: map.get(dateStr(day.date)) || [],
    }))
  )
}

export const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
]

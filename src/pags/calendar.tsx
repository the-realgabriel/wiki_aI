import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import {
  fetchEvents,
  createEvent,
  getMonthDays,
  assignEventsToDays,
  MONTH_NAMES,
  type CalendarEvent,
  type CalendarDay,
} from "@/lib/calendar"
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  PlusIcon,
  XIcon,
  Loader2,
} from "lucide-react"

const TYPE_COLORS: Record<string, string> = {
  meeting: "bg-accent",
  deadline: "bg-destructive",
  milestone: "bg-chart-3",
}

function getTypeColor(type: string): string {
  return TYPE_COLORS[type] || "bg-primary"
}

function DayCell({ day }: { day: CalendarDay }) {
  return (
    <div
      className={`min-h-[90px] p-1.5 border-b border-r border-border text-sm transition-colors ${
        !day.isCurrentMonth
          ? "opacity-30"
          : day.isToday
          ? "bg-accent/10"
          : "hover:bg-accent/30"
      }`}
    >
      <div className="flex items-center justify-between mb-1">
        <span
          className={`text-xs font-medium leading-none ${
            day.isToday ? "bg-primary text-primary-foreground size-5 flex items-center justify-center rounded-full" : ""
          }`}
        >
          {day.isToday ? "" : day.day}
        </span>
      </div>
      <div className="space-y-0.5">
        {day.events.slice(0, 3).map((ev, i) => (
          <div
            key={`${ev.date}-${i}`}
            className={`text-[10px] leading-tight px-1 py-0.5 rounded text-white truncate ${getTypeColor(ev.type)}`}
            title={ev.title}
          >
            {ev.title}
          </div>
        ))}
        {day.events.length > 3 && (
          <div className="text-[10px] text-muted-foreground font-medium px-1">
            +{day.events.length - 3} more
          </div>
        )}
      </div>
    </div>
  )
}

function getDateStr(year: number, month: number, day: number): string {
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`
}

export default function Calendar() {
  useEffect(() => { document.title = "Calendar — Dataphyte Wiki" }, [])
  const today = new Date()
  const [year, setYear] = useState(today.getFullYear())
  const [month, setMonth] = useState(today.getMonth())
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [formDate, setFormDate] = useState("")
  const [formTitle, setFormTitle] = useState("")
  const [formType, setFormType] = useState<CalendarEvent["type"]>("meeting")
  const [formDesc, setFormDesc] = useState("")
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetchEvents()
      .then((e) => { setEvents(e); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  const weeks = assignEventsToDays(getMonthDays(year, month), events)

  async function handleCreateEvent(e: React.FormEvent) {
    e.preventDefault()
    if (!formDate || !formTitle.trim()) return
    setSaving(true)
    const ev = await createEvent({
      date: formDate,
      title: formTitle.trim(),
      type: formType,
      description: formDesc.trim() || undefined,
    })
    setEvents((prev) => [...prev, ev])
    setSaving(false)
    setShowForm(false)
    setFormTitle("")
    setFormDesc("")
  }

  function prevMonth() {
    if (month === 0) { setYear((y) => y - 1); setMonth(11) }
    else setMonth((m) => m - 1)
  }

  function nextMonth() {
    if (month === 11) { setYear((y) => y + 1); setMonth(0) }
    else setMonth((m) => m + 1)
  }

  return (
    <>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Calendar</h1>
          <p className="text-muted-foreground mt-1">
            Team events, deadlines, and milestones
          </p>
        </div>
        <Button onClick={() => { setShowForm(true); setFormDate(getDateStr(year, month + 1, today.getDate())) }}>
          <PlusIcon className="size-4 mr-2" />
          Add Event
        </Button>
      </div>

      <div className="rounded-xl border bg-card overflow-hidden shadow-sm">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-muted/10">
          <Button variant="ghost" size="icon" onClick={prevMonth}>
            <ChevronLeftIcon className="size-4" />
          </Button>
          <h2 className="text-lg font-semibold">
            {MONTH_NAMES[month]} {year}
          </h2>
          <Button variant="ghost" size="icon" onClick={nextMonth}>
            <ChevronRightIcon className="size-4" />
          </Button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="size-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <div className="min-w-[560px]">
              <div className="grid grid-cols-7">
                {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
                  <div
                    key={d}
                    className="px-2 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider border-b border-r border-border bg-muted/30"
                  >
                    {d}
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-7">
                {weeks.flat().map((day, i) => (
                  <DayCell key={i} day={day} />
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="flex gap-4 mt-4 text-sm flex-wrap">
        <div className="flex items-center gap-1.5">
          <div className="size-3 rounded-sm bg-accent" />
          <span className="text-muted-foreground">Meeting</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="size-3 rounded-sm bg-destructive" />
          <span className="text-muted-foreground">Deadline</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="size-3 rounded-sm bg-chart-3" />
          <span className="text-muted-foreground">Milestone</span>
        </div>
      </div>

      {events.length > 0 && (
        <div className="mt-8">
          <h2 className="text-lg font-semibold mb-3">Upcoming Events</h2>
          <div className="rounded-xl border divide-y bg-card shadow-sm">
            {events
              .filter((ev) => ev.date >= getDateStr(year, month, 1))
              .slice(0, 5)
              .map((ev, i) => (
                <div key={i} className="flex items-center gap-3 px-4 py-3">
                  <div className={`size-2.5 rounded-full ${getTypeColor(ev.type)}`} />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium">{ev.title}</div>
                    <div className="text-xs text-muted-foreground">
                      {ev.date}{ev.description ? ` — ${ev.description}` : ""}
                    </div>
                  </div>
                  <span className="text-xs capitalize text-muted-foreground">{ev.type}</span>
                </div>
              ))}
          </div>
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-xl border bg-card p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">New Event</h2>
              <Button variant="ghost" size="icon" onClick={() => setShowForm(false)}>
                <XIcon className="size-4" />
              </Button>
            </div>
            <form onSubmit={handleCreateEvent} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Date</label>
                <input
                  type="date"
                  value={formDate}
                  onChange={(e) => setFormDate(e.target.value)}
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring/50"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Title</label>
                <input
                  type="text"
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  placeholder="Event title"
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring/50"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Type</label>
                <select
                  value={formType}
                  onChange={(e) => setFormType(e.target.value as CalendarEvent["type"])}
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring/50"
                >
                  <option value="meeting">Meeting</option>
                  <option value="deadline">Deadline</option>
                  <option value="milestone">Milestone</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Description</label>
                <textarea
                  value={formDesc}
                  onChange={(e) => setFormDesc(e.target.value)}
                  placeholder="Optional description"
                  rows={2}
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring/50"
                />
              </div>
              <Button type="submit" disabled={saving} className="w-full shadow-sm">
                {saving ? (
                  <><Loader2 className="size-4 mr-2 animate-spin" />Saving...</>
                ) : (
                  "Create Event"
                )}
              </Button>
            </form>
          </div>
        </div>
      )}
    </>
  )
}

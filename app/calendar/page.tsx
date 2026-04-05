"use client";

import { useSession, signIn } from "next-auth/react";
import { useEffect, useState } from "react";

// Structural / chrome colors (not event colors — those come from Google)
const CHROME = {
  black: "#000000",
  white: "#ffffff",
  yellow: "#ffdd00",
  red: "#cc0000",
  gridLine: "#dddddd",
  todayBg: "rgba(255,221,0,0.10)",
  muted: "#555555",
} as const;

interface CalendarEvent {
  id: string;
  title: string;
  start: string;
  end: string;
  allDay: boolean;
  color?: string | null;
  textColor?: string | null;
}

interface CalendarConfig {
  id: string;
  name: string;
  color: string;      // fallback when event has no Google color
  lightColor: string; // for all-day event backgrounds
}

// Same defaults as DualCalendar so localStorage config is compatible
const DEFAULT_CALENDARS: CalendarConfig[] = [
  {
    id: "primary",
    name: "Primary",
    color: "#f59e0b",
    lightColor: "rgba(245,158,11,0.20)",
  },
  {
    id: "sv.swedish#holiday@group.v.calendar.google.com",
    name: "Holidays",
    color: "#7c9885",
    lightColor: "rgba(124,152,133,0.20)",
  },
];

// Hours shown on the time grid (08:00 – 20:00)
const HOUR_START = 8;
const HOUR_END = 20;
const HOURS = Array.from({ length: HOUR_END - HOUR_START }, (_, i) => i + HOUR_START);

// Fixed canvas dimensions matching the e-ink display
const W = 800;
const H = 480;

export default function EInkPreviewPage() {
  const { data: session, status } = useSession();
  const [calendars, setCalendars] = useState<CalendarConfig[]>(DEFAULT_CALENDARS);
  const [primaryEvents, setPrimaryEvents] = useState<CalendarEvent[]>([]);
  const [secondaryEvents, setSecondaryEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [now] = useState(new Date());

  // Load calendar IDs from localStorage (same key as DualCalendar)
  useEffect(() => {
    const saved = localStorage.getItem("wallcalendar-config");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setCalendars([
          {
            ...DEFAULT_CALENDARS[0],
            id: parsed[0]?.id ?? DEFAULT_CALENDARS[0].id,
            name: parsed[0]?.name ?? DEFAULT_CALENDARS[0].name,
            color: parsed[0]?.color ?? DEFAULT_CALENDARS[0].color,
            lightColor: parsed[0]?.lightColor ?? DEFAULT_CALENDARS[0].lightColor,
          },
          {
            ...DEFAULT_CALENDARS[1],
            id: parsed[1]?.id ?? DEFAULT_CALENDARS[1].id,
            name: parsed[1]?.name ?? DEFAULT_CALENDARS[1].name,
            color: parsed[1]?.color ?? DEFAULT_CALENDARS[1].color,
            lightColor: parsed[1]?.lightColor ?? DEFAULT_CALENDARS[1].lightColor,
          },
        ]);
      } catch {}
    }
  }, []);

  useEffect(() => {
    if (status !== "authenticated") return;

    const fetchEvents = async (calendarId: string): Promise<CalendarEvent[]> => {
      const year = now.getFullYear();
      const month = now.getMonth();
      const res = await fetch(
        `/api/calendar/events?calendarId=${encodeURIComponent(calendarId)}&year=${year}&month=${month}`
      );
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      return data.events ?? [];
    };

    setLoading(true);
    Promise.all([fetchEvents(calendars[0].id), fetchEvents(calendars[1].id)])
      .then(([p, s]) => {
        setPrimaryEvents(p);
        setSecondaryEvents(s);
        setError(null);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [status, calendars, now]);

  if (status === "loading") {
    return <PreviewShell><LoadingState /></PreviewShell>;
  }

  if (session?.error === "RefreshAccessTokenError") {
    return (
      <PreviewShell>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", flexDirection: "column", gap: 8 }}>
          <span style={{ fontFamily: "monospace", fontSize: 12 }}>Session expired</span>
          <button onClick={() => signIn("google")} style={{ background: "#0055cc", color: "#fff", border: "none", padding: "8px 20px", fontSize: 13, cursor: "pointer", fontFamily: "monospace" }}>
            Sign in again
          </button>
        </div>
      </PreviewShell>
    );
  }

  if (!session) {
    return (
      <PreviewShell>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%" }}>
          <button
            onClick={() => signIn("google")}
            style={{
              background: "#0055cc", color: CHROME.white,
              border: `3px solid ${CHROME.black}`, padding: "12px 28px",
              fontSize: 16, fontWeight: 700, cursor: "pointer",
              fontFamily: "monospace",
            }}
          >
            Sign in with Google to preview
          </button>
        </div>
      </PreviewShell>
    );
  }

  if (loading) {
    return <PreviewShell><LoadingState /></PreviewShell>;
  }

  if (error) {
    return (
      <PreviewShell>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", flexDirection: "column", gap: 8 }}>
          <span style={{ fontFamily: "monospace", fontSize: 13 }}>Error: {error}</span>
        </div>
      </PreviewShell>
    );
  }

  return (
    <PreviewShell>
      <EInkCanvas
        now={now}
        calendars={calendars}
        primaryEvents={primaryEvents}
        secondaryEvents={secondaryEvents}
      />
    </PreviewShell>
  );
}

// ─── Outer shell: centers the 800×480 canvas with a device-like frame ─────────

function PreviewShell({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#1a1a1a",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 16,
        padding: 24,
        fontFamily: "system-ui, sans-serif",
      }}
    >
      <div style={{ color: "#888", fontSize: 12, letterSpacing: "0.08em", textTransform: "uppercase" }}>
        Waveshare 7.3&quot; E Ink Spectra 6 — 800 × 480 px preview
      </div>
      {/* Device bezel */}
      <div
        style={{
          background: "#111",
          borderRadius: 12,
          padding: 16,
          boxShadow: "0 0 0 2px #444, 0 8px 40px rgba(0,0,0,0.7)",
          display: "inline-flex",
        }}
      >
        {/* The exact pixel canvas */}
        <div
          style={{
            width: W,
            height: H,
            overflow: "hidden",
            position: "relative",
            background: CHROME.white,
            imageRendering: "crisp-edges",
          }}
        >
          {children}
        </div>
      </div>
    </div>
  );
}

function LoadingState() {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", fontFamily: "monospace", fontSize: 13 }}>
      Loading calendar…
    </div>
  );
}

// ─── The actual e-ink canvas ──────────────────────────────────────────────────

// Layout constants (all in px)
const HEADER_H = 28;        // Top bar: week + month/year
const DAY_HEADER_H = 32;    // Day name + date number
const ALLDAY_ROW_H = 20;    // One all-day events strip per calendar
const TIME_COL_W = 44;      // Hours label column width
const DAY_COL_W = Math.floor((W - TIME_COL_W) / 7); // ~108px per day

// Time grid
const GRID_TOP = HEADER_H + DAY_HEADER_H + ALLDAY_ROW_H * 2 + 1;
const GRID_H = H - GRID_TOP;
const PX_PER_HOUR = GRID_H / HOURS.length;

function EInkCanvas({
  now,
  calendars,
  primaryEvents,
  secondaryEvents,
}: {
  now: Date;
  calendars: CalendarConfig[];
  primaryEvents: CalendarEvent[];
  secondaryEvents: CalendarEvent[];
}) {
  const weekDays = getWeekDays(now);
  const todayStr = now.toDateString();
  const weekNum = getISOWeek(now);

  const DAY_NAMES = ["Måndag", "Tisdag", "Onsdag", "Torsdag", "Fredag", "Lördag", "Söndag"];
  const MONTH_NAMES = [
    "Januari","Februari","Mars","April","Maj","Juni",
    "Juli","Augusti","September","Oktober","November","December",
  ];

  return (
    <div style={{ position: "absolute", inset: 0, background: CHROME.white, fontFamily: "monospace" }}>

      {/* ── Header bar ── */}
      <div style={{
        position: "absolute", top: 0, left: 0, width: W, height: HEADER_H,
        background: CHROME.black, color: CHROME.white,
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "0 10px", boxSizing: "border-box",
      }}>
        <span style={{ fontSize: 13, color: CHROME.yellow, fontWeight: 700 }}>
          Vecka {weekNum}
        </span>
        <span style={{ fontSize: 13, fontWeight: 700, letterSpacing: "0.06em" }}>
          {MONTH_NAMES[now.getMonth()]} {now.getFullYear()}
        </span>
      </div>

      {/* ── Day headers ── */}
      {weekDays.map((day, i) => {
        const isToday = day.toDateString() === todayStr;
        const isMonday = day.getDay() === 1;
        const x = TIME_COL_W + i * DAY_COL_W;
        const dayName = DAY_NAMES[(day.getDay() + 6) % 7];
        return (
          <div key={i}>
            <div style={{
              position: "absolute",
              top: HEADER_H,
              left: x,
              width: DAY_COL_W,
              height: DAY_HEADER_H,
              background: isToday ? CHROME.yellow : CHROME.white,
              borderLeft: isMonday ? `3px solid ${CHROME.black}` : `1px solid ${CHROME.black}`,
              borderBottom: `1px solid ${CHROME.black}`,
              display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
              boxSizing: "border-box",
            }}>
              <span style={{ fontSize: 9, color: isToday ? CHROME.black : "#444", fontWeight: 700, letterSpacing: "0.02em", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: DAY_COL_W - 4 }}>
                {dayName}
              </span>
              <span style={{ fontSize: 14, fontWeight: isToday ? 700 : 400, color: CHROME.black, lineHeight: 1 }}>
                {day.getDate()}
              </span>
            </div>
            {/* Week number badge on Monday */}
            {isMonday && (
              <div style={{
                position: "absolute",
                top: HEADER_H,
                left: x,
                background: CHROME.black,
                color: CHROME.yellow,
                fontSize: 11,
                fontWeight: 700,
                padding: "1px 3px",
                lineHeight: 1,
                zIndex: 1,
              }}>
                V{getISOWeek(day)}
              </div>
            )}
          </div>
        );
      })}

      {/* Time column header */}
      <div style={{
        position: "absolute", top: HEADER_H, left: 0, width: TIME_COL_W, height: DAY_HEADER_H,
        borderBottom: `1px solid ${CHROME.black}`, background: CHROME.white,
        display: "flex", alignItems: "center", justifyContent: "center",
      }}>
        <span style={{ fontSize: 8, color: "#555" }}>UTC+1</span>
      </div>

      {/* ── All-day rows ── */}
      {[0, 1].map((calIdx) => {
        const events = calIdx === 0 ? primaryEvents : secondaryEvents;
        const cal = calendars[calIdx];
        const rowTop = HEADER_H + DAY_HEADER_H + calIdx * ALLDAY_ROW_H;

        return (
          <div key={calIdx}>
            {/* Row label */}
            <div style={{
              position: "absolute", top: rowTop, left: 0, width: TIME_COL_W, height: ALLDAY_ROW_H,
              background: cal.color, borderBottom: `1px solid ${CHROME.black}`,
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <span style={{ fontSize: 8, color: CHROME.white, fontWeight: 700, letterSpacing: "0.05em" }}>
                {cal.name.slice(0, 3).toUpperCase()}
              </span>
            </div>
            {/* Day cells */}
            {weekDays.map((day, dayIdx) => {
              const allDayEventsToday = getAllDayEventsForDay(day, events);
              const x = TIME_COL_W + dayIdx * DAY_COL_W;
              const isMonday = day.getDay() === 1;
              return (
                <div key={dayIdx} style={{
                  position: "absolute", top: rowTop, left: x, width: DAY_COL_W, height: ALLDAY_ROW_H,
                  borderLeft: isMonday ? `3px solid ${CHROME.black}` : `1px solid ${CHROME.black}`,
                  borderBottom: `1px solid ${CHROME.black}`,
                  boxSizing: "border-box", overflow: "hidden",
                  paddingLeft: 2,
                }}>
                  {allDayEventsToday.slice(0, 1).map((ev) => {
                    const evBg = ev.color ?? cal.color;
                    const evText = ev.textColor ?? CHROME.white;
                    return (
                      <div key={ev.id} style={{
                        height: ALLDAY_ROW_H - 3,
                        background: evBg, color: evText,
                        fontSize: 8, fontWeight: 700,
                        padding: "2px 3px", overflow: "hidden",
                        whiteSpace: "nowrap", textOverflow: "ellipsis",
                        marginTop: 1,
                      }}>
                        {ev.title}
                      </div>
                    );
                  })}
                  {allDayEventsToday.length > 1 && (
                    <span style={{ fontSize: 7, color: cal.color }}>+{allDayEventsToday.length - 1}</span>
                  )}
                </div>
              );
            })}
          </div>
        );
      })}

      {/* ── Time grid ── */}
      {/* Hour lines + labels */}
      {HOURS.map((hour, hi) => {
        const y = GRID_TOP + hi * PX_PER_HOUR;
        return (
          <div key={hour}>
            {/* Hour label */}
            <div style={{
              position: "absolute", top: y, left: 0, width: TIME_COL_W, height: PX_PER_HOUR,
              borderBottom: `1px solid #ddd`,
              display: "flex", alignItems: "flex-start", justifyContent: "flex-end",
              paddingRight: 4, paddingTop: 1, boxSizing: "border-box",
            }}>
              <span style={{ fontSize: 11, color: "#555" }}>{String(hour).padStart(2, "0")}:00</span>
            </div>
            {/* Horizontal rule across all day columns */}
            <div style={{
              position: "absolute", top: y, left: TIME_COL_W, width: W - TIME_COL_W, height: 1,
              background: "#ddd",
            }} />
          </div>
        );
      })}

      {/* Vertical day dividers + events */}
      {weekDays.map((day, dayIdx) => {
        const x = TIME_COL_W + dayIdx * DAY_COL_W;
        const isToday = day.toDateString() === todayStr;

        const primaryTimed = getTimedEventsForDay(day, primaryEvents);
        const secondaryTimed = getTimedEventsForDay(day, secondaryEvents);

        const isMonday = day.getDay() === 1;
        return (
          <div key={dayIdx}>
            {/* Day column background + left border */}
            <div style={{
              position: "absolute", top: GRID_TOP, left: x, width: DAY_COL_W, height: GRID_H,
              background: isToday ? "rgba(255,221,0,0.07)" : "transparent",
              borderLeft: isMonday ? `3px solid ${CHROME.black}` : `1px solid ${CHROME.black}`,
              boxSizing: "border-box",
            }} />

            {/* Primary calendar events (left half) */}
            {primaryTimed.map((ev) => {
              const pos = getEventGridPosition(ev);
              if (!pos) return null;
              return (
                <EventBlock
                  key={ev.id}
                  title={ev.title}
                  start={ev.start}
                  left={x + 1}
                  top={GRID_TOP + pos.topPct * GRID_H / 100}
                  width={Math.floor(DAY_COL_W / 2) - 2}
                  height={Math.max(8, pos.heightPct * GRID_H / 100)}
                  bg={ev.color ?? calendars[0].color}
                  textColor={ev.textColor ?? CHROME.white}
                />
              );
            })}

            {/* Secondary calendar events (right half) */}
            {secondaryTimed.map((ev) => {
              const pos = getEventGridPosition(ev);
              if (!pos) return null;
              return (
                <EventBlock
                  key={ev.id}
                  title={ev.title}
                  start={ev.start}
                  left={x + Math.floor(DAY_COL_W / 2) + 1}
                  top={GRID_TOP + pos.topPct * GRID_H / 100}
                  width={Math.floor(DAY_COL_W / 2) - 2}
                  height={Math.max(8, pos.heightPct * GRID_H / 100)}
                  bg={ev.color ?? calendars[1].color}
                  textColor={ev.textColor ?? CHROME.white}
                />
              );
            })}
          </div>
        );
      })}

      {/* Right border */}
      <div style={{
        position: "absolute", top: GRID_TOP, left: W - 1, width: 1, height: GRID_H,
        background: CHROME.black,
      }} />

      {/* Bottom border */}
      <div style={{
        position: "absolute", top: H - 1, left: 0, width: W, height: 1,
        background: CHROME.black,
      }} />


    </div>
  );
}

// ─── Event block ──────────────────────────────────────────────────────────────

function EventBlock({
  title, start, left, top, width, height, bg, textColor,
}: {
  title: string; start: string;
  left: number; top: number; width: number; height: number; bg: string; textColor: string;
}) {
  const startTime = new Date(start);
  const timeStr = startTime.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false });

  // fontSize 9 * lineHeight 1.3 ≈ 12px per line, 2px top padding
  const LINE_H = 12;
  const totalLines = Math.floor((height - 2) / LINE_H);
  // Always reserve the last line for the time; clamp title to remaining lines
  const titleLineClamp = Math.max(1, totalLines - 1);

  return (
    <div style={{
      position: "absolute", left, top, width, height,
      background: bg, color: textColor,
      overflow: "hidden", boxSizing: "border-box",
      padding: "1px 2px", fontSize: 9, lineHeight: 1.3,
      borderBottom: `1px solid ${CHROME.white}`,
      display: "flex", flexDirection: "column",
    }}>
      {totalLines >= 1 && (
        <div style={{
          fontWeight: 700,
          overflow: "hidden",
          display: "-webkit-box",
          WebkitLineClamp: titleLineClamp,
          WebkitBoxOrient: "vertical",
        }}>
          {title}
        </div>
      )}
      {totalLines >= 2 && (
        <div style={{ opacity: 0.85, marginTop: "auto" }}>{timeStr}</div>
      )}
    </div>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getWeekDays(date: Date): Date[] {
  const today = new Date(date);
  today.setHours(0, 0, 0, 0);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    return d;
  });
}

function getISOWeek(date: Date): number {
  const target = new Date(date.valueOf());
  const dayNumber = (date.getDay() + 6) % 7;
  target.setDate(target.getDate() - dayNumber + 3);
  const firstThursday = new Date(target.getFullYear(), 0, 4);
  return 1 + Math.round(
    ((target.getTime() - firstThursday.getTime()) / 86400000 - 3 + (firstThursday.getDay() + 6) % 7) / 7
  );
}

function getAllDayEventsForDay(day: Date, events: CalendarEvent[]): CalendarEvent[] {
  const dateStr = day.toISOString().split("T")[0];
  const current = new Date(dateStr);
  return events.filter((ev) => {
    if (!ev.allDay) return false;
    const start = new Date(ev.start.split("T")[0]);
    const end = new Date(ev.end.split("T")[0]);
    return current >= start && current < end;
  });
}

function getTimedEventsForDay(day: Date, events: CalendarEvent[]): CalendarEvent[] {
  const dateStr = day.toISOString().split("T")[0];
  return events.filter((ev) => {
    if (ev.allDay) return false;
    return ev.start.split("T")[0] === dateStr;
  });
}

function getEventGridPosition(event: CalendarEvent): { topPct: number; heightPct: number } | null {
  const start = new Date(event.start);
  const end = new Date(event.end);
  const startMin = start.getHours() * 60 + start.getMinutes();
  const endMin = end.getHours() * 60 + end.getMinutes();
  const gridStartMin = HOUR_START * 60;
  const gridEndMin = HOUR_END * 60;
  const totalMin = gridEndMin - gridStartMin;

  const clampedStart = Math.max(gridStartMin, Math.min(gridEndMin, startMin));
  const clampedEnd = Math.max(gridStartMin, Math.min(gridEndMin, endMin));
  if (clampedEnd <= clampedStart) return null;

  return {
    topPct: ((clampedStart - gridStartMin) / totalMin) * 100,
    heightPct: ((clampedEnd - clampedStart) / totalMin) * 100,
  };
}

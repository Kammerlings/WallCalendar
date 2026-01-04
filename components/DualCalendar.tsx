"use client";

import { useEffect, useState } from "react";
import CalendarSettings from "./CalendarSettings";

interface CalendarEvent {
  id: string;
  title: string;
  start: string;
  end: string;
  allDay: boolean;
}

interface CalendarConfig {
  id: string;
  name: string;
  color: string;
  lightColor: string;
}

const DEFAULT_CALENDARS: CalendarConfig[] = [
  {
    id: "primary",
    name: "Primary Calendar",
    color: "var(--calendar-primary)",
    lightColor: "var(--calendar-primary-light)",
  },
  {
    id: "sv.swedish#holiday@group.v.calendar.google.com",
    name: "Secondary Calendar",
    color: "var(--calendar-secondary)",
    lightColor: "var(--calendar-secondary-light)",
  },
];

export default function DualCalendar() {
  const [calendars, setCalendars] = useState<CalendarConfig[]>(DEFAULT_CALENDARS);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [primaryEvents, setPrimaryEvents] = useState<CalendarEvent[]>([]);
  const [secondaryEvents, setSecondaryEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState<"week" | "month">("week");

  const fetchCalendarEvents = async (calendarId: string) => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    const response = await fetch(
      `/api/calendar/events?calendarId=${encodeURIComponent(
        calendarId
      )}&year=${year}&month=${month}`
    );

    if (!response.ok) {
      throw new Error(`Failed to fetch calendar: ${response.statusText}`);
    }

    const data = await response.json();
    return data.events;
  };

  const loadEvents = async () => {
    try {
      setLoading(true);
      setError(null);

      const [primary, secondary] = await Promise.all([
        fetchCalendarEvents(calendars[0].id),
        fetchCalendarEvents(calendars[1].id),
      ]);

      setPrimaryEvents(primary);
      setSecondaryEvents(secondary);
    } catch (err: any) {
      console.error("Error loading calendar events:", err);
      setError(err.message || "Failed to load calendar events");
    } finally {
      setLoading(false);
    }
  };

  // Load calendars from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem("wallcalendar-config");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setCalendars(parsed);
      } catch (error) {
        console.error("Failed to parse saved calendars:", error);
      }
    }
  }, []);

  // Save calendars to localStorage when they change
  useEffect(() => {
    localStorage.setItem("wallcalendar-config", JSON.stringify(calendars));
  }, [calendars]);

  useEffect(() => {
    loadEvents();
  }, [currentDate, calendars]);

  const navigate = (direction: number) => {
    setIsTransitioning(true);
    setTimeout(() => {
      setCurrentDate((prev) => {
        const newDate = new Date(prev);
        if (view === "week") {
          newDate.setDate(newDate.getDate() + direction * 7);
        } else {
          newDate.setMonth(newDate.getMonth() + direction);
        }
        return newDate;
      });
      setTimeout(() => setIsTransitioning(false), 50);
    }, 50);
  };

  const goToToday = () => {
    setIsTransitioning(true);
    setTimeout(() => {
      setCurrentDate(new Date());
      setTimeout(() => setIsTransitioning(false), 50);
    }, 50);
  };

  const handleViewChange = (newView: "week" | "month") => {
    if (newView !== view) {
      setIsTransitioning(true);
      setTimeout(() => {
        setView(newView);
        setTimeout(() => setIsTransitioning(false), 50);
      }, 50);
    }
  };

  const handleSaveCalendars = (newCalendars: CalendarConfig[]) => {
    setCalendars(newCalendars);
  };

  const getDaysInWeek = (date: Date) => {
    const dayOfWeek = date.getDay();
    const weekStart = new Date(date);
    // Set to Monday of the week (day 0 = Sunday, day 1 = Monday)
    const daysFromMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    weekStart.setDate(date.getDate() - daysFromMonday);

    const days: Date[] = [];
    for (let i = 0; i < 7; i++) {
      const day = new Date(weekStart);
      day.setDate(weekStart.getDate() + i);
      days.push(day);
    }
    return days;
  };

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    const days: (Date | null)[] = [];
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null);
    }
    for (let day = 1; day <= daysInMonth; day++) {
      days.push(new Date(year, month, day));
    }
    return days;
  };

  const getEventsForDay = (date: Date | null, events: CalendarEvent[]) => {
    if (!date) return { timed: [], allDay: [] };

    const dateStr = date.toISOString().split("T")[0];
    const currentDate = new Date(dateStr);

    const dayEvents = events.filter((event) => {
      const eventStartStr = event.start.split("T")[0];
      const eventEndStr = event.end.split("T")[0];
      const eventStart = new Date(eventStartStr);
      const eventEnd = new Date(eventEndStr);

      // For all-day events, check if current date falls within the event's date range
      // Note: Google Calendar's end date is exclusive, so we use < instead of <=
      if (event.allDay) {
        return currentDate >= eventStart && currentDate < eventEnd;
      }

      // For timed events, only show on the start date
      return eventStartStr === dateStr;
    });

    return {
      allDay: dayEvents.filter((e) => e.allDay),
      timed: dayEvents.filter((e) => !e.allDay),
    };
  };

  const getEventPosition = (event: CalendarEvent) => {
    const startTime = new Date(event.start);
    const endTime = new Date(event.end);

    const startHour = startTime.getHours();
    const startMinute = startTime.getMinutes();
    const endHour = endTime.getHours();
    const endMinute = endTime.getMinutes();

    const startMinutesFromMidnight = startHour * 60 + startMinute;
    const endMinutesFromMidnight = endHour * 60 + endMinute;

    const minMinutes = 6 * 60; // 6 AM
    const maxMinutes = 22 * 60; // 10 PM
    const totalMinutes = maxMinutes - minMinutes;

    const topPercent =
      ((startMinutesFromMidnight - minMinutes) / totalMinutes) * 100;
    const heightPercent =
      ((endMinutesFromMidnight - startMinutesFromMidnight) / totalMinutes) * 100;

    return {
      top: Math.max(0, Math.min(100, topPercent)),
      height: Math.max(2, heightPercent),
    };
  };

  const hours = Array.from({ length: 16 }, (_, i) => i + 6); // 6 AM to 10 PM

  const getWeekNumber = (date: Date): number => {
    // ISO 8601 week number calculation
    const target = new Date(date.valueOf());
    const dayNumber = (date.getDay() + 6) % 7; // Make Monday = 0, Sunday = 6
    target.setDate(target.getDate() - dayNumber + 3); // Set to nearest Thursday
    const firstThursday = new Date(target.getFullYear(), 0, 4); // January 4th is always in week 1
    const weekNumber = 1 + Math.round(((target.getTime() - firstThursday.getTime()) / 86400000 - 3 + (firstThursday.getDay() + 6) % 7) / 7);
    return weekNumber;
  };

  const days = view === "week" ? getDaysInWeek(currentDate) : getDaysInMonth(currentDate);
  const title =
    view === "week"
      ? `Week ${getWeekNumber(currentDate)}, ${currentDate.getFullYear()}`
      : currentDate.toLocaleDateString("en-US", {
          month: "long",
          year: "numeric",
        });

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] p-4">
        <div
          className="max-w-md w-full text-center space-y-6 p-8 rounded-xl"
          style={{
            background: "var(--surface)",
            border: "1px solid var(--border)",
            boxShadow: "var(--shadow-lg)",
          }}
        >
          <div className="text-5xl" aria-hidden="true">
            ⚠️
          </div>
          <div className="space-y-2">
            <h2
              className="text-2xl font-semibold"
              style={{ fontFamily: "var(--font-display)" }}
            >
              Unable to Load Calendars
            </h2>
            <p className="text-[var(--foreground-muted)]">{error}</p>
          </div>
          <button
            onClick={loadEvents}
            aria-label="Retry loading calendars"
            style={{
              background:
                "linear-gradient(135deg, var(--accent-amber) 0%, var(--accent-coral) 100%)",
              color: "white",
              padding: "0.75rem 2rem",
              borderRadius: "var(--radius-lg)",
              border: "none",
              fontSize: "15px",
              fontWeight: 600,
              cursor: "pointer",
              transition: "all var(--transition-base)",
              boxShadow: "0 4px 12px rgb(245 158 11 / 0.3)",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = "translateY(-2px)";
              e.currentTarget.style.boxShadow =
                "0 8px 20px rgb(245 158 11 / 0.4)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = "translateY(0)";
              e.currentTarget.style.boxShadow =
                "0 4px 12px rgb(245 158 11 / 0.3)";
            }}
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      <CalendarSettings
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        calendars={calendars}
        onSave={handleSaveCalendars}
      />

      <div className="p-4 sm:p-6 lg:p-8">
        <div className="max-w-[1800px] mx-auto space-y-6">
          {/* Controls */}
          <div
            className="rounded-xl p-4 sm:p-6"
            style={{
              background: "var(--surface)",
              border: "1px solid var(--border)",
              boxShadow: "var(--shadow-md)",
            }}
          >
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <h2
                className="text-2xl sm:text-3xl font-bold"
                style={{ fontFamily: "var(--font-display)" }}
              >
                {title}
              </h2>

              <div className="flex flex-wrap items-center gap-2">
              {/* Settings Button */}
              <button
                onClick={() => setIsSettingsOpen(true)}
                aria-label="Calendar settings"
                title="Calendar settings"
                style={{
                  padding: "0.5rem 1rem",
                  borderRadius: "var(--radius-md)",
                  border: "1px solid var(--border)",
                  background: "var(--surface)",
                  color: "var(--foreground)",
                  cursor: "pointer",
                  transition: "all var(--transition-fast)",
                  fontSize: "14px",
                  fontWeight: 500,
                  display: "flex",
                  alignItems: "center",
                  gap: "0.5rem",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "var(--foreground)";
                  e.currentTarget.style.color = "var(--surface)";
                  e.currentTarget.style.borderColor = "var(--foreground)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "var(--surface)";
                  e.currentTarget.style.color = "var(--foreground)";
                  e.currentTarget.style.borderColor = "var(--border)";
                }}
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/>
                  <circle cx="12" cy="12" r="3"/>
                </svg>
                <span className="hidden sm:inline">Settings</span>
              </button>

              {/* View Toggle */}
              <div
                className="inline-flex rounded-lg p-1"
                role="group"
                aria-label="Calendar view selection"
                style={{
                  background: "var(--border-subtle)",
                }}
              >
                <button
                  onClick={() => handleViewChange("week")}
                  aria-label="Week view"
                  aria-pressed={view === "week"}
                  style={{
                    padding: "0.5rem 1rem",
                    borderRadius: "var(--radius-md)",
                    border: "none",
                    fontSize: "14px",
                    fontWeight: 500,
                    cursor: "pointer",
                    transition: "all var(--transition-fast)",
                    background:
                      view === "week" ? "var(--surface)" : "transparent",
                    color:
                      view === "week"
                        ? "var(--foreground)"
                        : "var(--foreground-muted)",
                    boxShadow: view === "week" ? "var(--shadow-sm)" : "none",
                  }}
                >
                  Week
                </button>
                <button
                  onClick={() => handleViewChange("month")}
                  aria-label="Month view"
                  aria-pressed={view === "month"}
                  style={{
                    padding: "0.5rem 1rem",
                    borderRadius: "var(--radius-md)",
                    border: "none",
                    fontSize: "14px",
                    fontWeight: 500,
                    cursor: "pointer",
                    transition: "all var(--transition-fast)",
                    background:
                      view === "month" ? "var(--surface)" : "transparent",
                    color:
                      view === "month"
                        ? "var(--foreground)"
                        : "var(--foreground-muted)",
                    boxShadow: view === "month" ? "var(--shadow-sm)" : "none",
                  }}
                >
                  Month
                </button>
              </div>

              {/* Navigation */}
              <div className="inline-flex gap-1">
                <button
                  onClick={() => navigate(-1)}
                  aria-label={`Previous ${view}`}
                  style={{
                    padding: "0.5rem 1rem",
                    borderRadius: "var(--radius-md)",
                    border: "1px solid var(--border)",
                    background: "var(--surface)",
                    color: "var(--foreground)",
                    fontSize: "14px",
                    fontWeight: 500,
                    cursor: "pointer",
                    transition: "all var(--transition-fast)",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = "var(--foreground)";
                    e.currentTarget.style.color = "var(--surface)";
                    e.currentTarget.style.borderColor = "var(--foreground)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = "var(--surface)";
                    e.currentTarget.style.color = "var(--foreground)";
                    e.currentTarget.style.borderColor = "var(--border)";
                  }}
                >
                  ←
                </button>
                <button
                  onClick={goToToday}
                  aria-label="Go to today"
                  style={{
                    padding: "0.5rem 1.25rem",
                    borderRadius: "var(--radius-md)",
                    border: "none",
                    background:
                      "linear-gradient(135deg, var(--accent-amber) 0%, var(--accent-coral) 100%)",
                    color: "white",
                    fontSize: "14px",
                    fontWeight: 600,
                    cursor: "pointer",
                    transition: "all var(--transition-fast)",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = "translateY(-1px)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = "translateY(0)";
                  }}
                >
                  Today
                </button>
                <button
                  onClick={() => navigate(1)}
                  aria-label={`Next ${view}`}
                  style={{
                    padding: "0.5rem 1rem",
                    borderRadius: "var(--radius-md)",
                    border: "1px solid var(--border)",
                    background: "var(--surface)",
                    color: "var(--foreground)",
                    fontSize: "14px",
                    fontWeight: 500,
                    cursor: "pointer",
                    transition: "all var(--transition-fast)",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = "var(--foreground)";
                    e.currentTarget.style.color = "var(--surface)";
                    e.currentTarget.style.borderColor = "var(--foreground)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = "var(--surface)";
                    e.currentTarget.style.color = "var(--foreground)";
                    e.currentTarget.style.borderColor = "var(--border)";
                  }}
                >
                  →
                </button>
              </div>
            </div>
          </div>

          {/* Calendar Legend */}
          <div className="flex flex-wrap gap-4 mt-4 pt-4 border-t border-[var(--border)]">
            {calendars.map((cal) => (
              <div key={cal.id} className="flex items-center gap-2">
                <div
                  style={{
                    width: "12px",
                    height: "12px",
                    borderRadius: "3px",
                    background: cal.color,
                  }}
                  aria-hidden="true"
                />
                <span className="text-sm text-[var(--foreground-muted)]">
                  {cal.name}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Calendar Grid */}
        <div
          className="rounded-xl overflow-hidden relative"
          style={{
            background: "var(--surface)",
            border: "1px solid var(--border)",
            boxShadow: "var(--shadow-lg)",
            transition: "opacity 150ms ease-out, transform 150ms ease-out",
            opacity: isTransitioning ? 0 : 1,
            transform: isTransitioning ? "scale(0.98)" : "scale(1)",
          }}
        >
          {view === "week" ? (
            <WeekView
              days={days as Date[]}
              hours={hours}
              primaryEvents={primaryEvents}
              secondaryEvents={secondaryEvents}
              calendars={calendars}
              getEventsForDay={getEventsForDay}
              getEventPosition={getEventPosition}
            />
          ) : (
            <MonthView
              days={days}
              primaryEvents={primaryEvents}
              secondaryEvents={secondaryEvents}
              calendars={calendars}
              getEventsForDay={getEventsForDay}
            />
          )}
        </div>
      </div>
    </div>
    </>
  );
}

// Week View Component
function WeekView({
  days,
  hours,
  primaryEvents,
  secondaryEvents,
  calendars,
  getEventsForDay,
  getEventPosition,
}: any) {
  const today = new Date().toDateString();

  return (
    <div>
      <div className="w-full">
        {/* Header */}
        <div className="grid grid-cols-[60px_repeat(7,1fr)] border-b border-[var(--border)]">
          <div style={{ background: "var(--border-subtle)" }} />
          {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((dayName, i) => {
            const day = days[i];
            const isToday = day.toDateString() === today;

            return (
              <div
                key={dayName}
                className="p-3 text-center border-l border-[var(--border)]"
                style={{
                  background: isToday
                    ? "var(--calendar-primary-light)"
                    : "var(--border-subtle)",
                }}
              >
                <div className="font-semibold text-sm">{dayName}</div>
                <div
                  className={`text-xl mt-1 ${
                    isToday ? "font-bold" : ""
                  }`}
                  style={{
                    color: isToday
                      ? "var(--calendar-primary)"
                      : "var(--foreground)",
                  }}
                >
                  {day.getDate()}
                </div>
              </div>
            );
          })}
        </div>

        {/* Primary calendar all-day events row */}
        <div className="relative border-b border-[var(--border)]">
          {(() => {
            // Calculate required height first
            const renderedEvents = new Set<string>();
            const eventLayers: Array<Array<{event: CalendarEvent, startIdx: number, endIdx: number}>> = [];

            days.forEach((day: Date) => {
              const dayEvents = getEventsForDay(day, primaryEvents).allDay;

              dayEvents.forEach((event: CalendarEvent) => {
                if (renderedEvents.has(event.id)) return;
                renderedEvents.add(event.id);

                const eventStart = new Date(event.start.split("T")[0]);
                const eventEnd = new Date(event.end.split("T")[0]);
                const weekStart = days[0];
                const weekEnd = days[6];

                const displayStart = eventStart < weekStart ? weekStart : eventStart;
                const displayEnd = eventEnd > weekEnd ? weekEnd : new Date(eventEnd.getTime() - 86400000);

                const startIdx = days.findIndex((d: Date) => d.toDateString() === displayStart.toDateString());
                const endIdx = days.findIndex((d: Date) => d.toDateString() === displayEnd.toDateString());

                if (startIdx >= 0 && endIdx >= 0) {
                  // Find a layer where this event doesn't overlap with existing events
                  let layerIdx = 0;
                  while (eventLayers[layerIdx]?.some((e: {event: CalendarEvent, startIdx: number, endIdx: number}) => 
                    !(endIdx < e.startIdx || startIdx > e.endIdx)
                  )) {
                    layerIdx++;
                  }
                  if (!eventLayers[layerIdx]) eventLayers[layerIdx] = [];
                  eventLayers[layerIdx].push({event, startIdx, endIdx});
                }
              });
            });

            const numLayers = eventLayers.length;
            const rowHeight = Math.max(32, numLayers * 24 + 8);

            return (
              <>
                <div className="grid grid-cols-[60px_repeat(7,1fr)]" style={{ minHeight: `${rowHeight}px` }}>
                  <div
                    className="flex items-center justify-center"
                    style={{ background: "var(--border-subtle)" }}
                  >
                    <div
                      className="w-4 h-4 rounded"
                      style={{ background: calendars[0].color }}
                      aria-label={calendars[0].name}
                      title={calendars[0].name}
                    />
                  </div>
                  {days.map((day: Date, dayIdx: number) => (
                    <div
                      key={`primary-allday-${dayIdx}`}
                      className="border-l border-[var(--border)] relative p-1"
                    >
                      {eventLayers.map((layer, layerIdx) => 
                        layer
                          .filter(({startIdx, endIdx}) => dayIdx >= startIdx && dayIdx <= endIdx)
                          .map(({event, startIdx, endIdx}) => {
                            if (startIdx !== dayIdx) return null;
                            const span = endIdx - startIdx + 1;
                            return (
                              <div
                                key={event.id}
                                className="rounded px-1.5 py-0.5 overflow-hidden cursor-pointer mb-0.5"
                                style={{
                                  background: calendars[0].lightColor,
                                  color: "var(--foreground)",
                                  fontSize: "11px",
                                  borderLeft: `3px solid ${calendars[0].color}`,
                                  position: "absolute",
                                  left: "4px",
                                  right: span > 1 ? `calc(${(7 - dayIdx - span) / 7 * 100}% + 4px)` : "4px",
                                  top: `${4 + layerIdx * 24}px`,
                                  height: "20px",
                                  width: span > 1 ? `calc(${span / 7 * 100}% - 8px)` : "calc(100% - 8px)",
                                }}
                                title={`${event.title} (All day)`}
                              >
                                <div className="font-semibold truncate">{event.title}</div>
                              </div>
                            );
                          })
                      )}
                    </div>
                  ))}
                </div>
              </>
            );
          })()}
        </div>

        {/* Secondary calendar all-day events row */}
        <div className="relative border-b border-[var(--border)]">
          {(() => {
            // Calculate required height first
            const renderedEvents = new Set<string>();
            const eventLayers: Array<Array<{event: CalendarEvent, startIdx: number, endIdx: number}>> = [];

            days.forEach((day: Date) => {
              const dayEvents = getEventsForDay(day, secondaryEvents).allDay;

              dayEvents.forEach((event: CalendarEvent) => {
                if (renderedEvents.has(event.id)) return;
                renderedEvents.add(event.id);

                const eventStart = new Date(event.start.split("T")[0]);
                const eventEnd = new Date(event.end.split("T")[0]);
                const weekStart = days[0];
                const weekEnd = days[6];

                const displayStart = eventStart < weekStart ? weekStart : eventStart;
                const displayEnd = eventEnd > weekEnd ? weekEnd : new Date(eventEnd.getTime() - 86400000);

                const startIdx = days.findIndex((d: Date) => d.toDateString() === displayStart.toDateString());
                const endIdx = days.findIndex((d: Date) => d.toDateString() === displayEnd.toDateString());

                if (startIdx >= 0 && endIdx >= 0) {
                  // Find a layer where this event doesn't overlap with existing events
                  let layerIdx = 0;
                  while (eventLayers[layerIdx]?.some((e: {event: CalendarEvent, startIdx: number, endIdx: number}) => 
                    !(endIdx < e.startIdx || startIdx > e.endIdx)
                  )) {
                    layerIdx++;
                  }
                  if (!eventLayers[layerIdx]) eventLayers[layerIdx] = [];
                  eventLayers[layerIdx].push({event, startIdx, endIdx});
                }
              });
            });

            const numLayers = eventLayers.length;
            const rowHeight = Math.max(32, numLayers * 24 + 8);

            return (
              <>
                <div className="grid grid-cols-[60px_repeat(7,1fr)]" style={{ minHeight: `${rowHeight}px` }}>
                  <div
                    className="flex items-center justify-center"
                    style={{ background: "var(--border-subtle)" }}
                  >
                    <div
                      className="w-4 h-4 rounded"
                      style={{ background: calendars[1].color }}
                      aria-label={calendars[1].name}
                      title={calendars[1].name}
                    />
                  </div>
                  {days.map((day: Date, dayIdx: number) => (
                    <div
                      key={`secondary-allday-${dayIdx}`}
                      className="border-l border-[var(--border)] relative p-1"
                    >
                      {eventLayers.map((layer, layerIdx) => 
                        layer
                          .filter(({startIdx, endIdx}) => dayIdx >= startIdx && dayIdx <= endIdx)
                          .map(({event, startIdx, endIdx}) => {
                            if (startIdx !== dayIdx) return null;
                            const span = endIdx - startIdx + 1;
                            return (
                              <div
                                key={event.id}
                                className="rounded px-1.5 py-0.5 overflow-hidden cursor-pointer mb-0.5"
                                style={{
                                  background: calendars[1].lightColor,
                                  color: "var(--foreground)",
                                  fontSize: "11px",
                                  borderLeft: `3px solid ${calendars[1].color}`,
                                  position: "absolute",
                                  left: "4px",
                                  right: span > 1 ? `calc(${(7 - dayIdx - span) / 7 * 100}% + 4px)` : "4px",
                                  top: `${4 + layerIdx * 24}px`,
                                  height: "20px",
                                  width: span > 1 ? `calc(${span / 7 * 100}% - 8px)` : "calc(100% - 8px)",
                                }}
                                title={`${event.title} (All day)`}
                              >
                                <div className="font-semibold truncate">{event.title}</div>
                              </div>
                            );
                          })
                      )}
                    </div>
                  ))}
                </div>
              </>
            );
          })()}
        </div>

        {/* Time Grid */}
        <div className="grid grid-cols-[60px_repeat(7,1fr)]">
          {/* Hours column */}
          <div>
            {hours.map((hour: number) => (
              <div
                key={hour}
                className="h-16 px-2 py-1 text-xs text-right text-[var(--foreground-muted)] border-b border-[var(--border-subtle)]"
              >
                {String(hour).padStart(2, '0')}:00
              </div>
            ))}
          </div>

          {/* Days columns */}
          {days.map((day: Date, dayIdx: number) => {
            const isToday = day.toDateString() === today;
            const primaryDayEvents = getEventsForDay(day, primaryEvents);
            const secondaryDayEvents = getEventsForDay(day, secondaryEvents);

            return (
              <div
                key={dayIdx}
                className="relative border-l border-[var(--border)]"
                style={{
                  background: isToday
                    ? "rgba(245, 158, 11, 0.02)"
                    : "transparent",
                }}
              >
                {/* Hour lines */}
                {hours.map((hour: number, hourIdx: number) => (
                  <div
                    key={hour}
                    className="h-16 border-b border-[var(--border-subtle)]"
                  />
                ))}

                {/* Events */}
                <div className="absolute inset-0 grid grid-cols-2 gap-px">
                  {/* Primary calendar events */}
                  <div className="relative border-r border-[var(--border-subtle)]">
                    {primaryDayEvents.timed.map((event: CalendarEvent) => {
                      const position = getEventPosition(event);
                      return (
                        <div
                          key={event.id}
                          className="absolute left-0.5 right-0.5 rounded px-1.5 py-1 overflow-hidden cursor-pointer transition-all hover:z-10 hover:shadow-md"
                          style={{
                            top: `${position.top}%`,
                            height: `${position.height}%`,
                            background: calendars[0].color,
                            color: "white",
                            fontSize: "11px",
                          }}
                          title={`${event.title}\n${new Date(event.start).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                            hour12: false,
                          })} - ${new Date(event.end).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                            hour12: false,
                          })}`}
                        >
                          <div className="font-semibold truncate">
                            {event.title}
                          </div>
                          <div className="text-[10px] opacity-90">
                            {new Date(event.start).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                              hour12: false,
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Secondary calendar events */}
                  <div className="relative">
                    {secondaryDayEvents.timed.map((event: CalendarEvent) => {
                      const position = getEventPosition(event);
                      return (
                        <div
                          key={event.id}
                          className="absolute left-0.5 right-0.5 rounded px-1.5 py-1 overflow-hidden cursor-pointer transition-all hover:z-10 hover:shadow-md"
                          style={{
                            top: `${position.top}%`,
                            height: `${position.height}%`,
                            background: calendars[1].color,
                            color: "white",
                            fontSize: "11px",
                          }}
                          title={`${event.title}\n${new Date(event.start).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                            hour12: false,
                          })} - ${new Date(event.end).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                            hour12: false,
                          })}`}
                        >
                          <div className="font-semibold truncate">
                            {event.title}
                          </div>
                          <div className="text-[10px] opacity-90">
                            {new Date(event.start).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                              hour12: false,
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// Month View Component
function MonthView({
  days,
  primaryEvents,
  secondaryEvents,
  calendars,
  getEventsForDay,
}: any) {
  const today = new Date().toDateString();

  return (
    <div className="p-4">
      <div className="grid grid-cols-7 gap-2">
        {/* Day headers */}
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
          <div
            key={day}
            className="text-center font-semibold text-sm py-2 rounded"
            style={{
              background: "var(--border-subtle)",
              color: "var(--foreground-muted)",
            }}
          >
            {day}
          </div>
        ))}

        {/* Days */}
        {days.map((day: Date | null, index: number) => {
          if (!day) {
            return (
              <div
                key={`empty-${index}`}
                className="min-h-[120px] rounded"
                style={{ background: "var(--border-subtle)" }}
              />
            );
          }

          const isToday = day.toDateString() === today;
          const primaryDayEvents = getEventsForDay(day, primaryEvents);
          const secondaryDayEvents = getEventsForDay(day, secondaryEvents);
          const allEvents = [
            ...primaryDayEvents.allDay,
            ...primaryDayEvents.timed,
            ...secondaryDayEvents.allDay,
            ...secondaryDayEvents.timed,
          ];

          return (
            <div
              key={index}
              className="min-h-[120px] p-2 rounded transition-all hover:shadow-md"
              style={{
                background: isToday
                  ? "var(--calendar-primary-light)"
                  : "var(--surface)",
                border: `1px solid ${
                  isToday ? "var(--calendar-primary)" : "var(--border)"
                }`,
                borderWidth: isToday ? "2px" : "1px",
              }}
            >
              <div
                className="text-sm font-semibold mb-2"
                style={{
                  color: isToday
                    ? "var(--calendar-primary)"
                    : "var(--foreground)",
                }}
              >
                {day.getDate()}
              </div>

              <div className="space-y-1">
                {allEvents.slice(0, 3).map((event) => {
                  const calIdx = primaryDayEvents.allDay.includes(event) ||
                    primaryDayEvents.timed.includes(event)
                    ? 0
                    : 1;
                  return (
                    <div
                      key={event.id}
                      className="text-xs px-1.5 py-1 rounded truncate"
                      style={{
                        background: calendars[calIdx].lightColor,
                        color: "var(--foreground)",
                        borderLeft: `3px solid ${calendars[calIdx].color}`,
                      }}
                      title={event.title}
                    >
                      {event.title}
                    </div>
                  );
                })}
                {allEvents.length > 3 && (
                  <div className="text-xs text-[var(--foreground-muted)] pl-1.5">
                    +{allEvents.length - 3} more
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import CalendarSettings from "./CalendarSettings";
import CalendarNav from "./CalendarNav";

interface CalendarEvent {
  id: string;
  title: string;
  start: string;
  end: string;
  allDay: boolean;
  colorId?: string | null;
  color?: string | null;
  textColor?: string | null;
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
    color: "#f59e0b",
    lightColor: "rgba(245, 158, 11, 0.15)",
  },
  {
    id: "sv.swedish#holiday@group.v.calendar.google.com",
    name: "Secondary Calendar",
    color: "#7c9885",
    lightColor: "rgba(124, 152, 133, 0.15)",
  },
];

export default function DualCalendar({ navInHeader = false, onNavPropsChange }: { 
  navInHeader?: boolean;
  onNavPropsChange?: (props: {
    view: "week" | "month";
    onViewChange: (view: "week" | "month") => void;
    onNavigate: (direction: number) => void;
    onToday: () => void;
    onSettingsClick: () => void;
  }) => void;
}) {
  const [calendars, setCalendars] = useState<CalendarConfig[]>(DEFAULT_CALENDARS);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [primaryEvents, setPrimaryEvents] = useState<CalendarEvent[]>([]);
  const [secondaryEvents, setSecondaryEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState<"week" | "month">("week");
  const [useGoogleColors, setUseGoogleColors] = useState(false);

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
    const savedUseGoogleColors = localStorage.getItem("wallcalendar-use-google-colors");
    if (savedUseGoogleColors) {
      setUseGoogleColors(JSON.parse(savedUseGoogleColors));
    }
  }, []);

  // Save calendars to localStorage when they change
  useEffect(() => {
    localStorage.setItem("wallcalendar-config", JSON.stringify(calendars));
  }, [calendars]);

  // Save useGoogleColors to localStorage when it changes
  useEffect(() => {
    localStorage.setItem("wallcalendar-use-google-colors", JSON.stringify(useGoogleColors));
  }, [useGoogleColors]);

  useEffect(() => {
    loadEvents();
  }, [currentDate, calendars]);

  // Expose navigation props to parent if callback provided
  useEffect(() => {
    if (onNavPropsChange) {
      onNavPropsChange({
        view,
        onViewChange: handleViewChange,
        onNavigate: navigate,
        onToday: goToToday,
        onSettingsClick: () => setIsSettingsOpen(true),
      });
    }
  }, [view, onNavPropsChange]);

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

    const minMinutes = 7 * 60; // 7 AM
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

  const hours = Array.from({ length: 15 }, (_, i) => i + 7); // 7 AM to 10 PM

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
        useGoogleColors={useGoogleColors}
        onUseGoogleColorsChange={setUseGoogleColors}
      />

      <div className="p-4 sm:p-6 lg:p-8">
        <div className="max-w-[1800px] mx-auto space-y-6">
          {/* Show navigation inline if not in header */}
          {!navInHeader && (
            <CalendarNav
              view={view}
              onViewChange={handleViewChange}
              onNavigate={navigate}
              onToday={goToToday}
              onSettingsClick={() => setIsSettingsOpen(true)}
            />
          )}

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
              useGoogleColors={useGoogleColors}
              getWeekNumber={getWeekNumber}
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
  useGoogleColors,
  getWeekNumber,
}: any) {
  const today = new Date().toDateString();

  return (
    <div>
      <div className="w-full">
        {/* Header */}
        <div className="grid grid-cols-[60px_repeat(7,1fr)] border-b border-[var(--border)]">
          <div 
            className="flex flex-col items-center justify-center text-center p-2"
            style={{ background: "var(--border-subtle)" }}
          >
            <div className="text-xs font-semibold text-[var(--foreground-muted)]">
              {days[0].toLocaleDateString('en-US', { month: 'short' })}
            </div>
            <div className="text-[11px] font-semibold text-[var(--foreground-muted)] mt-0.5">
              W{getWeekNumber(days[0])}
            </div>
            <div className="text-[10px] text-[var(--foreground-muted)]">
              {days[0].getFullYear()}
            </div>
          </div>
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
                    className="flex items-center justify-center text-[10px] font-semibold"
                    style={{ background: calendars[0].color, color: "white" }}
                    title={calendars[0].name}
                  >
                    {calendars[0].name.charAt(0).toUpperCase()}
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
                            const eventBg = useGoogleColors && event.color ? event.color : calendars[0].lightColor;
                            const eventBorder = useGoogleColors && event.color ? event.color : calendars[0].color;
                            return (
                              <div
                                key={event.id}
                                className="rounded px-1.5 py-0.5 overflow-hidden cursor-pointer mb-0.5"
                                style={{
                                  background: eventBg,
                                  color: useGoogleColors && event.color ? (event.textColor || "white") : "var(--foreground)",
                                  fontSize: "11px",
                                  borderLeft: useGoogleColors && event.color ? "none" : `3px solid ${eventBorder}`,
                                  position: "absolute",
                                  left: "4px",
                                  top: `${4 + layerIdx * 24}px`,
                                  height: "20px",
                                  width: `calc(${span * 100}% - 8px)`,
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
                    className="flex items-center justify-center text-[10px] font-semibold"
                    style={{ background: calendars[1].color, color: "white" }}
                    title={calendars[1].name}
                  >
                    {calendars[1].name.charAt(0).toUpperCase()}
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
                            const eventBg = useGoogleColors && event.color ? event.color : calendars[1].lightColor;
                            const eventBorder = useGoogleColors && event.color ? event.color : calendars[1].color;
                            return (
                              <div
                                key={event.id}
                                className="rounded px-1.5 py-0.5 overflow-hidden cursor-pointer mb-0.5"
                                style={{
                                  background: eventBg,
                                  color: useGoogleColors && event.color ? (event.textColor || "white") : "var(--foreground)",
                                  fontSize: "11px",
                                  borderLeft: useGoogleColors && event.color ? "none" : `3px solid ${eventBorder}`,
                                  position: "absolute",
                                  left: "4px",
                                  top: `${4 + layerIdx * 24}px`,
                                  height: "20px",
                                  width: `calc(${span * 100}% - 8px)`,
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
                <div className="absolute inset-0">
                  {/* Column headers with initials - absolute positioned */}
                  <div className="absolute top-0 left-0 right-0 grid grid-cols-2 h-5 text-[10px] font-semibold z-10">
                    <div 
                      className="flex items-center justify-center border-r border-[var(--border-subtle)]"
                      style={{ background: calendars[0].color, color: "white" }}
                      title={calendars[0].name}
                    >
                      {calendars[0].name.charAt(0).toUpperCase()}
                    </div>
                    <div 
                      className="flex items-center justify-center"
                      style={{ background: calendars[1].color, color: "white" }}
                      title={calendars[1].name}
                    >
                      {calendars[1].name.charAt(0).toUpperCase()}
                    </div>
                  </div>
                  {/* Event columns */}
                  <div className="absolute inset-0 grid grid-cols-2 gap-px">
                    {/* Primary calendar events */}
                    <div className="relative border-r border-[var(--border-subtle)]">
                      {primaryDayEvents.timed.map((event: CalendarEvent) => {
                        const position = getEventPosition(event);
                        const eventBg = useGoogleColors && event.color ? event.color : calendars[0].color;
                        const eventTextColor = useGoogleColors && event.textColor ? event.textColor : "white";
                        return (
                          <div
                            key={event.id}
                            className="absolute left-0.5 right-0.5 rounded px-1.5 py-1 overflow-hidden cursor-pointer transition-all hover:z-10 hover:shadow-md"
                            style={{
                              top: `${position.top}%`,
                              height: `${position.height}%`,
                              background: eventBg,
                              color: eventTextColor,
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
                            {position.height > 4 && (
                              <div className="text-[10px] opacity-90">
                                {new Date(event.start).toLocaleTimeString([], {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                  hour12: false,
                                })}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    {/* Secondary calendar events */}
                    <div className="relative">
                      {secondaryDayEvents.timed.map((event: CalendarEvent) => {
                        const position = getEventPosition(event);
                        const eventBg = useGoogleColors && event.color ? event.color : calendars[1].color;
                        const eventTextColor = useGoogleColors && event.textColor ? event.textColor : "white";
                        return (
                          <div
                            key={event.id}
                            className="absolute left-0.5 right-0.5 rounded px-1.5 py-1 overflow-hidden cursor-pointer transition-all hover:z-10 hover:shadow-md"
                            style={{
                              top: `${position.top}%`,
                              height: `${position.height}%`,
                              background: eventBg,
                              color: eventTextColor,
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
                            {position.height > 5 && (
                              <div className="text-[10px] opacity-90">
                                {new Date(event.start).toLocaleTimeString([], {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                  hour12: false,
                                })}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
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

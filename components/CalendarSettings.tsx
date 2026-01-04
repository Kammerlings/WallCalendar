"use client";

import { useState, useEffect } from "react";

interface CalendarConfig {
  id: string;
  name: string;
  color: string;
  lightColor: string;
}

interface CalendarSettingsProps {
  isOpen: boolean;
  onClose: () => void;
  calendars: CalendarConfig[];
  onSave: (calendars: CalendarConfig[]) => void;
}

export default function CalendarSettings({
  isOpen,
  onClose,
  calendars,
  onSave,
}: CalendarSettingsProps) {
  const [primaryId, setPrimaryId] = useState(calendars[0]?.id || "primary");
  const [primaryName, setPrimaryName] = useState(calendars[0]?.name || "Primary Calendar");
  const [secondaryId, setSecondaryId] = useState(calendars[1]?.id || "");
  const [secondaryName, setSecondaryName] = useState(calendars[1]?.name || "Secondary Calendar");
  const [mouseDownTarget, setMouseDownTarget] = useState<EventTarget | null>(null);

  useEffect(() => {
    if (isOpen) {
      setPrimaryId(calendars[0]?.id || "primary");
      setPrimaryName(calendars[0]?.name || "Primary Calendar");
      setSecondaryId(calendars[1]?.id || "");
      setSecondaryName(calendars[1]?.name || "Secondary Calendar");
    }
  }, [isOpen, calendars]);

  const handleSave = () => {
    const updatedCalendars: CalendarConfig[] = [
      {
        id: primaryId,
        name: primaryName,
        color: calendars[0].color,
        lightColor: calendars[0].lightColor,
      },
      {
        id: secondaryId,
        name: secondaryName,
        color: calendars[1].color,
        lightColor: calendars[1].lightColor,
      },
    ];
    onSave(updatedCalendars);
    onClose();
  };

  const handleBackdropMouseDown = (e: React.MouseEvent) => {
    setMouseDownTarget(e.target);
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    // Only close if mousedown and mouseup happened on the same element (the backdrop)
    if (e.target === mouseDownTarget && e.target === e.currentTarget) {
      onClose();
    }
    setMouseDownTarget(null);
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0, 0, 0, 0.5)", backdropFilter: "blur(4px)" }}
      onMouseDown={handleBackdropMouseDown}
      onClick={handleBackdropClick}
    >
      <div
        className="w-full max-w-2xl animate-scaleIn"
        style={{
          background: "var(--surface)",
          borderRadius: "var(--radius-xl)",
          boxShadow: "var(--shadow-xl)",
          border: "1px solid var(--border)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className="px-6 py-4 border-b border-[var(--border)]"
          style={{
            borderTopLeftRadius: "var(--radius-xl)",
            borderTopRightRadius: "var(--radius-xl)",
          }}
        >
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-semibold" style={{ fontFamily: "var(--font-body)" }}>
              Calendar Settings
            </h2>
            <button
              onClick={onClose}
              aria-label="Close settings"
              className="p-2 rounded-lg transition-colors hover:bg-[var(--border)]"
            >
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Primary Calendar */}
          <div
            className="p-4 rounded-lg border"
            style={{
              background: "var(--border-subtle)",
              borderColor: "var(--border)",
            }}
          >
            <div className="flex items-center gap-2 mb-4">
              <div
                className="w-4 h-4 rounded"
                style={{ background: calendars[0].color }}
                aria-hidden="true"
              />
              <h3 className="font-semibold text-lg" style={{ fontFamily: "var(--font-body)" }}>Primary Calendar</h3>
            </div>

            <div className="space-y-4">
              <div>
                <label
                  htmlFor="primary-name"
                  className="block text-sm font-medium mb-1"
                >
                  Calendar Name
                </label>
                <input
                  id="primary-name"
                  type="text"
                  value={primaryName}
                  onChange={(e) => setPrimaryName(e.target.value)}
                  placeholder="e.g., Work Calendar"
                  className="w-full"
                  style={{
                    padding: "0.75rem",
                    borderRadius: "var(--radius-md)",
                    border: "1px solid var(--border)",
                    background: "var(--surface)",
                    fontSize: "15px",
                  }}
                />
              </div>

              <div>
                <label
                  htmlFor="primary-id"
                  className="block text-sm font-medium mb-1"
                >
                  Calendar ID
                </label>
                <input
                  id="primary-id"
                  type="text"
                  value={primaryId}
                  onChange={(e) => setPrimaryId(e.target.value)}
                  placeholder="primary or your-email@gmail.com"
                  className="w-full font-mono text-sm"
                  style={{
                    padding: "0.75rem",
                    borderRadius: "var(--radius-md)",
                    border: "1px solid var(--border)",
                    background: "var(--surface)",
                  }}
                />
                <p className="text-xs text-[var(--foreground-muted)] mt-1">
                  Use "primary" for your main Google Calendar, or enter a specific calendar ID
                </p>
              </div>
            </div>
          </div>

          {/* Secondary Calendar */}
          <div
            className="p-4 rounded-lg border"
            style={{
              background: "var(--border-subtle)",
              borderColor: "var(--border)",
            }}
          >
            <div className="flex items-center gap-2 mb-4">
              <div
                className="w-4 h-4 rounded"
                style={{ background: calendars[1].color }}
                aria-hidden="true"
              />
              <h3 className="font-semibold text-lg" style={{ fontFamily: "var(--font-body)" }}>Secondary Calendar</h3>
            </div>

            <div className="space-y-4">
              <div>
                <label
                  htmlFor="secondary-name"
                  className="block text-sm font-medium mb-1"
                >
                  Calendar Name
                </label>
                <input
                  id="secondary-name"
                  type="text"
                  value={secondaryName}
                  onChange={(e) => setSecondaryName(e.target.value)}
                  placeholder="e.g., Personal Calendar"
                  className="w-full"
                  style={{
                    padding: "0.75rem",
                    borderRadius: "var(--radius-md)",
                    border: "1px solid var(--border)",
                    background: "var(--surface)",
                    fontSize: "15px",
                  }}
                />
              </div>

              <div>
                <label
                  htmlFor="secondary-id"
                  className="block text-sm font-medium mb-1"
                >
                  Calendar ID
                </label>
                <input
                  id="secondary-id"
                  type="text"
                  value={secondaryId}
                  onChange={(e) => setSecondaryId(e.target.value)}
                  placeholder="calendar-id@group.calendar.google.com"
                  className="w-full font-mono text-sm"
                  style={{
                    padding: "0.75rem",
                    borderRadius: "var(--radius-md)",
                    border: "1px solid var(--border)",
                    background: "var(--surface)",
                  }}
                />
                <p className="text-xs text-[var(--foreground-muted)] mt-1">
                  Find this in Google Calendar settings under "Integrate calendar"
                </p>
              </div>
            </div>
          </div>

          {/* Help text */}
          <div
            className="p-4 rounded-lg"
            style={{
              background: "var(--calendar-primary-light)",
              border: "1px solid var(--calendar-primary)",
            }}
          >
            <h4 className="font-semibold text-sm mb-2" style={{ fontFamily: "var(--font-body)" }}>How to find your Calendar ID:</h4>
            <ol className="text-sm text-[var(--foreground-muted)] space-y-1 list-decimal list-inside">
              <li>Open Google Calendar on your computer</li>
              <li>Click on the calendar you want to use in the left sidebar</li>
              <li>Click the three dots and select "Settings and sharing"</li>
              <li>Scroll to "Integrate calendar" section</li>
              <li>Copy the "Calendar ID"</li>
            </ol>
          </div>
        </div>

        {/* Footer */}
        <div
          className="px-6 py-4 border-t border-[var(--border)] flex justify-end gap-3"
        >
          <button
            onClick={onClose}
            style={{
              padding: "0.75rem 1.5rem",
              borderRadius: "var(--radius-md)",
              border: "1px solid var(--border)",
              background: "var(--surface)",
              color: "var(--foreground)",
              fontSize: "15px",
              fontWeight: 500,
              cursor: "pointer",
              transition: "all var(--transition-fast)",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "var(--border-subtle)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "var(--surface)";
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            style={{
              padding: "0.75rem 1.5rem",
              borderRadius: "var(--radius-md)",
              border: "none",
              background:
                "linear-gradient(135deg, var(--accent-amber) 0%, var(--accent-coral) 100%)",
              color: "white",
              fontSize: "15px",
              fontWeight: 600,
              cursor: "pointer",
              transition: "all var(--transition-fast)",
              boxShadow: "0 4px 12px rgb(245 158 11 / 0.3)",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = "translateY(-1px)";
              e.currentTarget.style.boxShadow = "0 6px 16px rgb(245 158 11 / 0.4)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = "translateY(0)";
              e.currentTarget.style.boxShadow = "0 4px 12px rgb(245 158 11 / 0.3)";
            }}
          >
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
}

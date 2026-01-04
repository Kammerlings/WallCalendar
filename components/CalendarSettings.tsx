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
  useGoogleColors: boolean;
  onUseGoogleColorsChange: (value: boolean) => void;
}

export default function CalendarSettings({
  isOpen,
  onClose,
  calendars,
  onSave,
  useGoogleColors,
  onUseGoogleColorsChange,
}: CalendarSettingsProps) {
  const [primaryId, setPrimaryId] = useState(calendars[0]?.id || "primary");
  const [primaryName, setPrimaryName] = useState(calendars[0]?.name || "Primary Calendar");
  const [primaryColor, setPrimaryColor] = useState(calendars[0]?.color || "#f59e0b");
  const [secondaryId, setSecondaryId] = useState(calendars[1]?.id || "");
  const [secondaryName, setSecondaryName] = useState(calendars[1]?.name || "Secondary Calendar");
  const [secondaryColor, setSecondaryColor] = useState(calendars[1]?.color || "#78716c");
  const [mouseDownTarget, setMouseDownTarget] = useState<EventTarget | null>(null);
  const [showTooltip, setShowTooltip] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setPrimaryId(calendars[0]?.id || "primary");
      setPrimaryName(calendars[0]?.name || "Primary Calendar");
      setPrimaryColor(calendars[0]?.color || "#f59e0b");
      setSecondaryId(calendars[1]?.id || "");
      setSecondaryName(calendars[1]?.name || "Secondary Calendar");
      setSecondaryColor(calendars[1]?.color || "#78716c");
    }
  }, [isOpen, calendars]);

  const hexToRgba = (hex: string, alpha: number) => {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  };

  const handleSave = () => {
    const updatedCalendars: CalendarConfig[] = [
      {
        id: primaryId,
        name: primaryName,
        color: primaryColor,
        lightColor: hexToRgba(primaryColor, 0.15),
      },
      {
        id: secondaryId,
        name: secondaryName,
        color: secondaryColor,
        lightColor: hexToRgba(secondaryColor, 0.15),
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
            <h2 className="text-2xl font-bold" style={{ fontFamily: "var(--font-display)" }}>
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
                  className="flex items-center gap-1 text-sm font-medium mb-1"
                >
                  Calendar ID
                  <div className="relative inline-block">
                    <svg
                      onMouseEnter={() => setShowTooltip(true)}
                      onMouseLeave={() => setShowTooltip(false)}
                      className="w-4 h-4 text-[var(--foreground-muted)] cursor-help"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <circle cx="12" cy="12" r="10" strokeWidth="2" />
                      <path d="M12 16v-4" strokeWidth="2" strokeLinecap="round" />
                      <circle cx="12" cy="8" r="0.5" fill="currentColor" strokeWidth="1" />
                    </svg>
                    {showTooltip && (
                      <div
                        className="absolute left-6 top-0 z-50 w-64 p-3 text-xs rounded-lg shadow-lg"
                        style={{
                          background: "var(--surface)",
                          border: "1px solid var(--border)",
                          color: "var(--foreground)",
                        }}
                      >
                        <div className="font-semibold mb-1">How to find your Calendar ID:</div>
                        <ol className="space-y-0.5 list-decimal list-inside text-[var(--foreground-muted)]">
                          <li>Open Google Calendar</li>
                          <li>Click calendar in left sidebar</li>
                          <li>Click ⋮ → "Settings and sharing"</li>
                          <li>Scroll to "Integrate calendar"</li>
                          <li>Copy the "Calendar ID"</li>
                        </ol>
                      </div>
                    )}
                  </div>
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

              <div>
                <label
                  htmlFor="primary-color"
                  className="block text-sm font-medium mb-1"
                >
                  Calendar Color
                </label>
                <div className="flex items-center gap-3">
                  <input
                    id="primary-color"
                    type="color"
                    value={primaryColor}
                    onChange={(e) => setPrimaryColor(e.target.value)}
                    className="h-10 w-20 cursor-pointer rounded"
                    style={{
                      border: "1px solid var(--border)",
                    }}
                  />
                  <input
                    type="text"
                    value={primaryColor}
                    onChange={(e) => setPrimaryColor(e.target.value)}
                    className="flex-1 font-mono text-sm"
                    style={{
                      padding: "0.5rem",
                      borderRadius: "var(--radius-md)",
                      border: "1px solid var(--border)",
                      background: "var(--surface)",
                    }}
                  />
                </div>
                <p className="text-xs text-[var(--foreground-muted)] mt-1">
                  Default color for events (used when Google colors are disabled)
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
                  className="flex items-center gap-1 text-sm font-medium mb-1"
                >
                  Calendar ID
                  <div className="relative inline-block">
                    <svg
                      onMouseEnter={() => setShowTooltip(true)}
                      onMouseLeave={() => setShowTooltip(false)}
                      className="w-4 h-4 text-[var(--foreground-muted)] cursor-help"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <circle cx="12" cy="12" r="10" strokeWidth="2" />
                      <path d="M12 16v-4" strokeWidth="2" strokeLinecap="round" />
                      <circle cx="12" cy="8" r="0.5" fill="currentColor" strokeWidth="1" />
                    </svg>
                    {showTooltip && (
                      <div
                        className="absolute left-6 top-0 z-50 w-64 p-3 text-xs rounded-lg shadow-lg"
                        style={{
                          background: "var(--surface)",
                          border: "1px solid var(--border)",
                          color: "var(--foreground)",
                        }}
                      >
                        <div className="font-semibold mb-1">How to find your Calendar ID:</div>
                        <ol className="space-y-0.5 list-decimal list-inside text-[var(--foreground-muted)]">
                          <li>Open Google Calendar</li>
                          <li>Click calendar in left sidebar</li>
                          <li>Click ⋮ → "Settings and sharing"</li>
                          <li>Scroll to "Integrate calendar"</li>
                          <li>Copy the "Calendar ID"</li>
                        </ol>
                      </div>
                    )}
                  </div>
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

              <div>
                <label
                  htmlFor="secondary-color"
                  className="block text-sm font-medium mb-1"
                >
                  Calendar Color
                </label>
                <div className="flex items-center gap-3">
                  <input
                    id="secondary-color"
                    type="color"
                    value={secondaryColor}
                    onChange={(e) => setSecondaryColor(e.target.value)}
                    className="h-10 w-20 cursor-pointer rounded"
                    style={{
                      border: "1px solid var(--border)",
                    }}
                  />
                  <input
                    type="text"
                    value={secondaryColor}
                    onChange={(e) => setSecondaryColor(e.target.value)}
                    className="flex-1 font-mono text-sm"
                    style={{
                      padding: "0.5rem",
                      borderRadius: "var(--radius-md)",
                      border: "1px solid var(--border)",
                      background: "var(--surface)",
                    }}
                  />
                </div>
                <p className="text-xs text-[var(--foreground-muted)] mt-1">
                  Default color for events (used when Google colors are disabled)
                </p>
              </div>
            </div>
          </div>

          {/* Display Options */}
          <div
            className="p-4 rounded-lg border"
            style={{
              background: "var(--border-subtle)",
              borderColor: "var(--border)",
            }}
          >
            <h3 className="font-semibold text-lg mb-4" style={{ fontFamily: "var(--font-body)" }}>Display Options</h3>
            
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={useGoogleColors}
                onChange={(e) => onUseGoogleColorsChange(e.target.checked)}
                className="w-5 h-5 rounded"
                style={{
                  accentColor: "var(--accent-amber)",
                }}
              />
              <div>
                <div className="font-medium">Use Google Calendar colors</div>
                <p className="text-xs text-[var(--foreground-muted)]">
                  Display events with their original colors from Google Calendar
                </p>
              </div>
            </label>
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

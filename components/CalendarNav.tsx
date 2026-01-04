"use client";

interface CalendarNavProps {
  view: "week" | "month";
  onViewChange: (view: "week" | "month") => void;
  onNavigate: (direction: number) => void;
  onToday: () => void;
  onSettingsClick: () => void;
}

export default function CalendarNav({
  view,
  onViewChange,
  onNavigate,
  onToday,
  onSettingsClick,
}: CalendarNavProps) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {/* Settings Button */}
      <button
        onClick={onSettingsClick}
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
          onClick={() => onViewChange("week")}
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
            background: view === "week" ? "var(--surface)" : "transparent",
            color: view === "week" ? "var(--foreground)" : "var(--foreground-muted)",
            boxShadow: view === "week" ? "var(--shadow-sm)" : "none",
          }}
        >
          Week
        </button>
        <button
          onClick={() => onViewChange("month")}
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
            background: view === "month" ? "var(--surface)" : "transparent",
            color: view === "month" ? "var(--foreground)" : "var(--foreground-muted)",
            boxShadow: view === "month" ? "var(--shadow-sm)" : "none",
          }}
        >
          Month
        </button>
      </div>

      {/* Navigation */}
      <div className="inline-flex gap-1">
        <button
          onClick={() => onNavigate(-1)}
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
          onClick={onToday}
          aria-label="Go to today"
          style={{
            padding: "0.5rem 1.25rem",
            borderRadius: "var(--radius-md)",
            border: "none",
            background: "linear-gradient(135deg, var(--accent-amber) 0%, var(--accent-coral) 100%)",
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
          onClick={() => onNavigate(1)}
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
  );
}

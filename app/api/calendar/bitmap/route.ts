import { NextRequest, NextResponse } from "next/server";
import { google } from "googleapis";
import { createCanvas, GlobalFonts } from "@napi-rs/canvas";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// ─── E-ink color palette ──────────────────────────────────────────────────────
// Indices match EPD_7IN3E color constants exactly
const EINK_PALETTE = [
  { idx: 0x0, r: 0,   g: 0,   b: 0   }, // BLACK
  { idx: 0x1, r: 255, g: 255, b: 255 }, // WHITE
  { idx: 0x2, r: 255, g: 221, b: 0   }, // YELLOW
  { idx: 0x3, r: 204, g: 0,   b: 0   }, // RED
  { idx: 0x5, r: 0,   g: 85,  b: 204 }, // BLUE
  { idx: 0x6, r: 0,   g: 119, b: 0   }, // GREEN
];

function nearestEinkIndex(r: number, g: number, b: number): number {
  let best = 0x1;
  let bestDist = Infinity;
  for (const c of EINK_PALETTE) {
    const d = (r - c.r) ** 2 + (g - c.g) ** 2 + (b - c.b) ** 2;
    if (d < bestDist) { bestDist = d; best = c.idx; }
  }
  return best;
}

// ─── Layout constants (match the React preview exactly) ──────────────────────
const W = 800, H = 480;
const HEADER_H = 28;
const DAY_HEADER_H = 32;
const ALLDAY_ROW_H = 20;
const TIME_COL_W = 44;
const DAY_COL_W = Math.floor((W - TIME_COL_W) / 7); // 108
const GRID_TOP = HEADER_H + DAY_HEADER_H + ALLDAY_ROW_H * 2;
const GRID_H = H - GRID_TOP;
const HOUR_START = 8, HOUR_END = 20;
const HOURS = Array.from({ length: HOUR_END - HOUR_START }, (_, i) => i + HOUR_START);
const PX_PER_HOUR = GRID_H / HOURS.length;

const DAY_NAMES = ["Måndag", "Tisdag", "Onsdag", "Torsdag", "Fredag", "Lördag", "Söndag"];
const MONTH_NAMES = ["Januari","Februari","Mars","April","Maj","Juni","Juli","Augusti","September","Oktober","November","December"];

// ─── Calendar config from env vars ───────────────────────────────────────────
interface CalConfig { id: string; name: string; color: string; }

function getCalendars(): [CalConfig, CalConfig] {
  return [
    {
      id: process.env.CALENDAR_1_ID ?? "primary",
      name: process.env.CALENDAR_1_NAME ?? "Calendar 1",
      color: process.env.CALENDAR_1_COLOR ?? "#f59e0b",
    },
    {
      id: process.env.CALENDAR_2_ID ?? "",
      name: process.env.CALENDAR_2_NAME ?? "Calendar 2",
      color: process.env.CALENDAR_2_COLOR ?? "#7c9885",
    },
  ];
}

// ─── Google OAuth: exchange refresh token for access token ───────────────────
async function getAccessToken(): Promise<string> {
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      refresh_token: process.env.GOOGLE_REFRESH_TOKEN!,
      grant_type: "refresh_token",
    }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(`Token refresh failed: ${data.error}`);
  return data.access_token;
}

// ─── Fetch calendar events for a date range ───────────────────────────────────
interface CalEvent {
  id: string; title: string;
  start: string; end: string;
  allDay: boolean;
  color?: string | null; textColor?: string | null;
}

const EVENT_COLORS: Record<string, { bg: string; fg: string }> = {
  "1":  { bg: "#7986cb", fg: "#ffffff" }, "2":  { bg: "#33b679", fg: "#ffffff" },
  "3":  { bg: "#8e24aa", fg: "#ffffff" }, "4":  { bg: "#e67c73", fg: "#ffffff" },
  "5":  { bg: "#f6bf26", fg: "#000000" }, "6":  { bg: "#f4511e", fg: "#ffffff" },
  "7":  { bg: "#039be5", fg: "#ffffff" }, "8":  { bg: "#616161", fg: "#ffffff" },
  "9":  { bg: "#3f51b5", fg: "#ffffff" }, "10": { bg: "#0b8043", fg: "#ffffff" },
  "11": { bg: "#d60000", fg: "#ffffff" },
};

async function fetchEvents(accessToken: string, calendarId: string, from: Date, to: Date): Promise<CalEvent[]> {
  const auth = new google.auth.OAuth2();
  auth.setCredentials({ access_token: accessToken });
  const cal = google.calendar({ version: "v3", auth });

  const res = await cal.events.list({
    calendarId,
    timeMin: from.toISOString(),
    timeMax: to.toISOString(),
    singleEvents: true,
    orderBy: "startTime",
  });

  return (res.data.items ?? []).map(ev => {
    const ec = ev.colorId ? EVENT_COLORS[ev.colorId] : null;
    return {
      id: ev.id ?? "",
      title: ev.summary ?? "(no title)",
      start: ev.start?.dateTime ?? ev.start?.date ?? "",
      end: ev.end?.dateTime ?? ev.end?.date ?? "",
      allDay: !ev.start?.dateTime,
      color: ec?.bg ?? null,
      textColor: ec?.fg ?? null,
    };
  });
}

// ─── Canvas rendering ─────────────────────────────────────────────────────────
function getWeekDays(today: Date): Date[] {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    return d;
  });
}

function getISOWeek(date: Date): number {
  const target = new Date(date);
  const day = (date.getDay() + 6) % 7;
  target.setDate(target.getDate() - day + 3);
  const firstThursday = new Date(target.getFullYear(), 0, 4);
  return 1 + Math.round(((target.getTime() - firstThursday.getTime()) / 86400000 - 3 + (firstThursday.getDay() + 6) % 7) / 7);
}

function getAllDayEvents(day: Date, events: CalEvent[]): CalEvent[] {
  const dateStr = day.toISOString().split("T")[0];
  const current = new Date(dateStr);
  return events.filter(ev => {
    if (!ev.allDay) return false;
    const start = new Date(ev.start.split("T")[0]);
    const end = new Date(ev.end.split("T")[0]);
    return current >= start && current < end;
  });
}

function getTimedEvents(day: Date, events: CalEvent[]): CalEvent[] {
  const dateStr = day.toISOString().split("T")[0];
  return events.filter(ev => !ev.allDay && ev.start.split("T")[0] === dateStr);
}

function renderCalendar(
  ctx: ReturnType<ReturnType<typeof createCanvas>["getContext"]>,
  today: Date,
  cal1: CalConfig, events1: CalEvent[],
  cal2: CalConfig, events2: CalEvent[],
) {
  const weekDays = getWeekDays(today);
  const todayStr = today.toDateString();
  const weekNum = getISOWeek(today);

  // ── White background
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, W, H);

  // ── Header bar
  ctx.fillStyle = "#000000";
  ctx.fillRect(0, 0, W, HEADER_H);
  ctx.fillStyle = "#ffdd00";
  ctx.font = "bold 13px sans-serif";
  ctx.textBaseline = "middle";
  ctx.fillText(`Vecka ${weekNum}`, 10, HEADER_H / 2);
  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 13px sans-serif";
  const monthStr = `${MONTH_NAMES[today.getMonth()]} ${today.getFullYear()}`;
  const monthW = ctx.measureText(monthStr).width;
  ctx.fillText(monthStr, W - monthW - 10, HEADER_H / 2);

  // ── Day headers + all-day strips
  for (let i = 0; i < 7; i++) {
    const day = weekDays[i];
    const isToday = day.toDateString() === todayStr;
    const isMonday = day.getDay() === 1;
    const x = TIME_COL_W + i * DAY_COL_W;

    // Day header background
    ctx.fillStyle = isToday ? "#ffdd00" : "#ffffff";
    ctx.fillRect(x, HEADER_H, DAY_COL_W, DAY_HEADER_H);

    // Day name
    ctx.fillStyle = "#444444";
    ctx.font = "bold 9px sans-serif";
    ctx.textBaseline = "top";
    ctx.fillText(DAY_NAMES[(day.getDay() + 6) % 7], x + 4, HEADER_H + 4);

    // Date number
    ctx.fillStyle = "#000000";
    ctx.font = `${isToday ? "bold" : "normal"} 16px sans-serif`;
    ctx.textBaseline = "bottom";
    ctx.fillText(String(day.getDate()), x + 4, HEADER_H + DAY_HEADER_H - 2);

    // Week number badge on Monday
    if (isMonday) {
      ctx.fillStyle = "#000000";
      ctx.fillRect(x, HEADER_H, 26, 12);
      ctx.fillStyle = "#ffdd00";
      ctx.font = "bold 9px sans-serif";
      ctx.textBaseline = "top";
      ctx.fillText(`V${getISOWeek(day)}`, x + 2, HEADER_H + 1);
    }

    // Monday thick left border
    const borderW = isMonday ? 3 : 1;
    ctx.fillStyle = "#000000";
    ctx.fillRect(x, HEADER_H, borderW, H - HEADER_H);

    // ── All-day rows
    for (let calIdx = 0; calIdx < 2; calIdx++) {
      const events = calIdx === 0 ? events1 : events2;
      const cal = calIdx === 0 ? cal1 : cal2;
      const rowTop = HEADER_H + DAY_HEADER_H + calIdx * ALLDAY_ROW_H;

      // Cell border
      ctx.fillStyle = "#cccccc";
      ctx.fillRect(x, rowTop + ALLDAY_ROW_H - 1, DAY_COL_W, 1);

      const allDay = getAllDayEvents(day, events);
      if (allDay.length > 0) {
        const ev = allDay[0];
        const bg = ev.color ?? cal.color;
        const fg = ev.textColor ?? "#ffffff";
        ctx.fillStyle = bg;
        ctx.fillRect(x + borderW, rowTop + 2, DAY_COL_W - borderW - 1, ALLDAY_ROW_H - 4);
        ctx.fillStyle = fg;
        ctx.font = "bold 8px sans-serif";
        ctx.textBaseline = "middle";
        // Truncate title to fit
        let title = ev.title;
        while (title.length > 0 && ctx.measureText(title + (allDay.length > 1 ? "…" : "")).width > DAY_COL_W - borderW - 6) {
          title = title.slice(0, -1);
        }
        ctx.fillText(title + (allDay.length > 1 ? "…" : ""), x + borderW + 2, rowTop + ALLDAY_ROW_H / 2);
      }
    }
  }

  // ── Time column labels
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, HEADER_H, TIME_COL_W, H - HEADER_H);

  // Calendar labels in all-day row stubs
  for (let calIdx = 0; calIdx < 2; calIdx++) {
    const cal = calIdx === 0 ? cal1 : cal2;
    const rowTop = HEADER_H + DAY_HEADER_H + calIdx * ALLDAY_ROW_H;
    ctx.fillStyle = cal.color;
    ctx.fillRect(0, rowTop, TIME_COL_W, ALLDAY_ROW_H);
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 8px sans-serif";
    ctx.textBaseline = "middle";
    ctx.fillText(cal.name.slice(0, 3).toUpperCase(), 4, rowTop + ALLDAY_ROW_H / 2);

    // Bottom border
    ctx.fillStyle = "#000000";
    ctx.fillRect(0, rowTop + ALLDAY_ROW_H - 1, W, 1);
  }

  // ── Hour lines + labels
  for (let hi = 0; hi < HOURS.length; hi++) {
    const y = GRID_TOP + hi * PX_PER_HOUR;
    ctx.fillStyle = "#dddddd";
    ctx.fillRect(TIME_COL_W, y, W - TIME_COL_W, 1);
    ctx.fillStyle = "#555555";
    ctx.font = "11px sans-serif";
    ctx.textBaseline = "top";
    ctx.fillText(`${String(HOURS[hi]).padStart(2, "0")}:00`, 2, y + 1);
  }

  // ── Timed events
  for (let i = 0; i < 7; i++) {
    const day = weekDays[i];
    const x = TIME_COL_W + i * DAY_COL_W;
    const isMonday = day.getDay() === 1;
    const halfW = Math.floor(DAY_COL_W / 2) - 1;

    const timed1 = getTimedEvents(day, events1);
    const timed2 = getTimedEvents(day, events2);

    [[timed1, x + (isMonday ? 3 : 1), cal1], [timed2, x + Math.floor(DAY_COL_W / 2) + 1, cal2]].forEach(([evList, evX, cal]) => {
      for (const ev of evList as CalEvent[]) {
        const start = new Date(ev.start);
        const end = new Date(ev.end);
        const startMin = start.getHours() * 60 + start.getMinutes();
        const endMin = end.getHours() * 60 + end.getMinutes();
        const gridMin = HOUR_START * 60;
        const totalMin = (HOUR_END - HOUR_START) * 60;
        const topPct = Math.max(0, Math.min(1, (startMin - gridMin) / totalMin));
        const botPct = Math.max(0, Math.min(1, (endMin - gridMin) / totalMin));
        if (botPct <= topPct) continue;

        const evTop = GRID_TOP + topPct * GRID_H;
        const evH = Math.max(6, (botPct - topPct) * GRID_H);
        const bg = ev.color ?? (cal as CalConfig).color;
        const fg = ev.textColor ?? "#ffffff";

        ctx.fillStyle = bg;
        ctx.fillRect(evX as number, evTop, halfW - 1, evH);

        if (evH > 10) {
          ctx.fillStyle = fg;
          ctx.font = "bold 9px sans-serif";
          ctx.textBaseline = "top";
          // Wrap title
          const words = (ev.title).split(" ");
          let line = "", lineY = evTop + 2;
          const lineH = 12;
          const maxLines = Math.floor((evH - lineH) / lineH); // reserve last line for time
          let linesDrawn = 0;
          for (const word of words) {
            const test = line ? `${line} ${word}` : word;
            if (ctx.measureText(test).width > halfW - 4 && line) {
              if (linesDrawn >= maxLines) { ctx.fillText(line + "…", evX as number + 1, lineY); break; }
              ctx.fillText(line, evX as number + 1, lineY);
              line = word; lineY += lineH; linesDrawn++;
            } else {
              line = test;
            }
          }
          if (line && linesDrawn <= maxLines) ctx.fillText(line, evX as number + 1, lineY);
          // Time on last line
          if (evH > 22) {
            const timeStr = start.toLocaleTimeString("sv-SE", { hour: "2-digit", minute: "2-digit" });
            ctx.font = "9px sans-serif";
            ctx.fillText(timeStr, evX as number + 1, evTop + evH - lineH);
          }
        }

        // Bottom separator
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(evX as number, evTop + evH - 1, halfW - 1, 1);
      }
    });
  }

  // ── Outer borders
  ctx.fillStyle = "#000000";
  ctx.fillRect(0, H - 1, W, 1);      // bottom
  ctx.fillRect(W - 1, GRID_TOP, 1, GRID_H); // right
  ctx.fillRect(0, HEADER_H + DAY_HEADER_H - 1, TIME_COL_W, 1); // time col bottom
}

// ─── Route handler ────────────────────────────────────────────────────────────
export async function GET(request: NextRequest) {
  // Verify API key
  const key = request.nextUrl.searchParams.get("key");
  if (!key || key !== process.env.ESP32_API_KEY) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  // Load system fonts if available
  try { (GlobalFonts as any).loadSystemFonts(); } catch {}

  try {
    const accessToken = await getAccessToken();
    const [cal1, cal2] = getCalendars();

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const weekEnd = new Date(today);
    weekEnd.setDate(today.getDate() + 7);

    const [events1, events2] = await Promise.all([
      fetchEvents(accessToken, cal1.id, today, weekEnd),
      fetchEvents(accessToken, cal2.id, today, weekEnd),
    ]);

    // Render to canvas
    const canvas = createCanvas(W, H);
    const ctx = canvas.getContext("2d");
    renderCalendar(ctx, today, cal1, events1, cal2, events2);

    // Get RGBA pixels
    const { data: rgba } = ctx.getImageData(0, 0, W, H);

    // Quantize + pack as 4bpp (even pixel → high nibble, odd → low nibble)
    const packed = new Uint8Array(W / 2 * H); // 192,000 bytes
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x += 2) {
        const i0 = (y * W + x) * 4;
        const i1 = i0 + 4;
        const c0 = nearestEinkIndex(rgba[i0], rgba[i0 + 1], rgba[i0 + 2]);
        const c1 = nearestEinkIndex(rgba[i1], rgba[i1 + 1], rgba[i1 + 2]);
        packed[y * (W / 2) + x / 2] = (c0 << 4) | c1;
      }
    }

    return new NextResponse(packed, {
      headers: {
        "Content-Type": "application/octet-stream",
        "Content-Length": String(packed.length),
        "Cache-Control": "no-store",
      },
    });
  } catch (err: any) {
    console.error("Bitmap render error:", err);
    return new NextResponse(err.message ?? "Internal error", { status: 500 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import { google } from "googleapis";
import { createCanvas, GlobalFonts } from "@napi-rs/canvas";
import { existsSync, readFileSync } from "fs";
import { join } from "path";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// ─── Font loading (DM Sans — same as the /calendar preview page) ─────────────
let fontsReady = false;
let activeFontSource = "uninitialized";

async function ensureFonts(): Promise<string> {
  if (fontsReady) return activeFontSource;

  let fontRegistered = false;

  // Prefer bundled font assets from node_modules for deterministic serverless deploys.
  const bundledCandidates = [
    join(process.cwd(), "node_modules", "@fontsource", "dm-sans", "files", "dm-sans-latin-400-normal.woff"),
    join(process.cwd(), "node_modules", "@fontsource", "dm-sans", "files", "dm-sans-latin-700-normal.woff"),
  ];
  for (const p of bundledCandidates) {
    if (existsSync(p)) {
      try {
        GlobalFonts.register(readFileSync(p), "DM Sans");
        fontRegistered = true;
        activeFontSource = `bundled:${p}`;
      } catch (e) {
        console.error("Bundled font registration failed:", p, e);
      }
    }
  }

  // jsDelivr CDN serving @fontsource/dm-sans v4 TTF files
  const CDN = "https://cdn.jsdelivr.net/npm/@fontsource/dm-sans@4.5.1/files";
  const weights: Array<[string, string]> = [
    [`${CDN}/dm-sans-all-400-normal.ttf`, "DM Sans"],
    [`${CDN}/dm-sans-all-700-normal.ttf`, "DM Sans"],
  ];

  // Try system fonts first (fast path on some environments)
  const systemCandidates = [
    // Windows
    "C:/Windows/Fonts/arial.ttf",
    "C:/Windows/Fonts/arialbd.ttf",
    // macOS
    "/System/Library/Fonts/Supplemental/Arial.ttf",
    "/System/Library/Fonts/Supplemental/Arial Bold.ttf",
    // Linux
    "/usr/share/fonts/liberation/LiberationSans-Regular.ttf",
    "/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf",
    "/usr/share/fonts/dejavu/DejaVuSans.ttf",
    "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
  ];
  let systemLoaded = false;
  for (const p of systemCandidates) {
    if (!fontRegistered && existsSync(p)) {
      try {
        GlobalFonts.register(readFileSync(p), "DM Sans");
        systemLoaded = true;
        fontRegistered = true;
        activeFontSource = `system:${p}`;
        break;
      } catch (e) {
        console.error("System font registration failed:", p, e);
      }
    }
  }

  if (!systemLoaded && !fontRegistered) {
    // Fetch DM Sans TTF from jsDelivr
    console.log("Fetching DM Sans from CDN…");
    await Promise.all(
      weights.map(async ([url, family]) => {
        try {
          const res = await fetch(url);
          if (res.ok) {
            GlobalFonts.register(Buffer.from(await res.arrayBuffer()), family);
            fontRegistered = true;
            activeFontSource = `cdn:${url}`;
          }
        } catch (e) {
          console.error("Font fetch failed:", url, e);
        }
      })
    );
  }

  if (!fontRegistered) {
    throw new Error(
      "No font could be registered for bitmap rendering. Install a system sans-serif font or allow outbound access to jsDelivr."
    );
  }

  fontsReady = true;
  return activeFontSource;
}

// ─── E-ink color palette ──────────────────────────────────────────────────────
const EINK_PALETTE = [
  { idx: 0x0, r: 0,   g: 0,   b: 0   }, // BLACK
  { idx: 0x1, r: 255, g: 255, b: 255 }, // WHITE
  { idx: 0x2, r: 255, g: 221, b: 0   }, // YELLOW
  { idx: 0x3, r: 204, g: 0,   b: 0   }, // RED
  { idx: 0x5, r: 0,   g: 85,  b: 204 }, // BLUE
  { idx: 0x6, r: 0,   g: 119, b: 0   }, // GREEN
];

function nearestEinkIndex(r: number, g: number, b: number): number {
  let best = 0x1, bestDist = Infinity;
  for (const c of EINK_PALETTE) {
    const d = (r - c.r) ** 2 + (g - c.g) ** 2 + (b - c.b) ** 2;
    if (d < bestDist) { bestDist = d; best = c.idx; }
  }
  return best;
}

// ─── Layout constants (must match app/calendar/page.tsx exactly) ──────────────
const W = 800, H = 480;
const HEADER_H     = 28;
const DAY_HEADER_H = 32;
const ALLDAY_ROW_H = 20;
const TIME_COL_W   = 44;
const DAY_COL_W    = Math.floor((W - TIME_COL_W) / 7); // 108
const GRID_TOP     = HEADER_H + DAY_HEADER_H + ALLDAY_ROW_H * 2;
const GRID_H       = H - GRID_TOP;
const HOUR_START   = 8, HOUR_END = 20;
const HOURS        = Array.from({ length: HOUR_END - HOUR_START }, (_, i) => i + HOUR_START);
const PX_PER_HOUR  = GRID_H / HOURS.length;

const DAY_NAMES   = ["Måndag","Tisdag","Onsdag","Torsdag","Fredag","Lördag","Söndag"];
const MONTH_NAMES = ["Januari","Februari","Mars","April","Maj","Juni","Juli","Augusti","September","Oktober","November","December"];
const FONT_STACK = "'DM Sans', 'Arial', 'Liberation Sans', 'DejaVu Sans', sans-serif";

// ─── Calendar config from env vars ───────────────────────────────────────────
interface CalConfig { id: string; name: string; color: string; }

function getCalendars(): [CalConfig, CalConfig] {
  return [
    { id: process.env.CALENDAR_1_ID ?? "primary",
      name: process.env.CALENDAR_1_NAME ?? "Calendar 1",
      color: process.env.CALENDAR_1_COLOR ?? "#f59e0b" },
    { id: process.env.CALENDAR_2_ID ?? "",
      name: process.env.CALENDAR_2_NAME ?? "Calendar 2",
      color: process.env.CALENDAR_2_COLOR ?? "#7c9885" },
  ];
}

// ─── Google auth ──────────────────────────────────────────────────────────────
async function getAccessToken(): Promise<string> {
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id:     process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      refresh_token: process.env.GOOGLE_REFRESH_TOKEN!,
      grant_type:    "refresh_token",
    }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(`Token refresh failed: ${data.error}`);
  return data.access_token;
}

// ─── Google Calendar fetch ────────────────────────────────────────────────────
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

async function fetchEvents(token: string, calendarId: string, from: Date, to: Date): Promise<CalEvent[]> {
  const auth = new google.auth.OAuth2();
  auth.setCredentials({ access_token: token });
  const cal = google.calendar({ version: "v3", auth });
  const res = await cal.events.list({
    calendarId, singleEvents: true, orderBy: "startTime",
    timeMin: from.toISOString(), timeMax: to.toISOString(),
  });
  return (res.data.items ?? []).map(ev => {
    const ec = ev.colorId ? EVENT_COLORS[ev.colorId] : null;
    return {
      id: ev.id ?? "", title: ev.summary ?? "(no title)",
      start: ev.start?.dateTime ?? ev.start?.date ?? "",
      end:   ev.end?.dateTime   ?? ev.end?.date   ?? "",
      allDay: !ev.start?.dateTime,
      color: ec?.bg ?? null, textColor: ec?.fg ?? null,
    };
  });
}

// ─── Date helpers ─────────────────────────────────────────────────────────────
function getWeekDays(today: Date): Date[] {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(today); d.setDate(today.getDate() + i); return d;
  });
}

function getISOWeek(date: Date): number {
  const t = new Date(date);
  const day = (date.getDay() + 6) % 7;
  t.setDate(t.getDate() - day + 3);
  const jan4 = new Date(t.getFullYear(), 0, 4);
  return 1 + Math.round(((t.getTime() - jan4.getTime()) / 86400000 - 3 + (jan4.getDay() + 6) % 7) / 7);
}

function getAllDayEvents(day: Date, events: CalEvent[]): CalEvent[] {
  const cur = new Date(day.toISOString().split("T")[0]);
  return events.filter(ev => {
    if (!ev.allDay) return false;
    const s = new Date(ev.start.split("T")[0]);
    const e = new Date(ev.end.split("T")[0]);
    return cur >= s && cur < e;
  });
}

function getTimedEvents(day: Date, events: CalEvent[]): CalEvent[] {
  const ds = day.toISOString().split("T")[0];
  return events.filter(ev => !ev.allDay && ev.start.split("T")[0] === ds);
}

// ─── Canvas rendering ─────────────────────────────────────────────────────────
type Ctx = ReturnType<ReturnType<typeof createCanvas>["getContext"]>;

function renderCalendar(
  ctx: Ctx, today: Date,
  cal1: CalConfig, events1: CalEvent[],
  cal2: CalConfig, events2: CalEvent[],
) {
  const weekDays = getWeekDays(today);
  const todayStr = today.toDateString();
  const weekNum  = getISOWeek(today);

  // White background
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, W, H);

  // ── Header bar
  ctx.fillStyle = "#000000";
  ctx.fillRect(0, 0, W, HEADER_H);

  ctx.fillStyle = "#ffdd00";
  ctx.font = `bold 13px ${FONT_STACK}`;
  ctx.textBaseline = "middle";
  ctx.fillText(`Vecka ${weekNum}`, 10, HEADER_H / 2);

  ctx.fillStyle = "#ffffff";
  ctx.font = `bold 13px ${FONT_STACK}`;
  const monthStr = `${MONTH_NAMES[today.getMonth()]} ${today.getFullYear()}`;
  ctx.fillText(monthStr, W - ctx.measureText(monthStr).width - 10, HEADER_H / 2);

  // ── Day columns
  for (let i = 0; i < 7; i++) {
    const day      = weekDays[i];
    const isToday  = day.toDateString() === todayStr;
    const isMonday = day.getDay() === 1;
    const x        = TIME_COL_W + i * DAY_COL_W;
    const borderW  = isMonday ? 3 : 1;

    // Thick Monday border runs full height
    ctx.fillStyle = "#000000";
    ctx.fillRect(x, HEADER_H, borderW, H - HEADER_H);

    // Day header background
    ctx.fillStyle = isToday ? "#ffdd00" : "#ffffff";
    ctx.fillRect(x + borderW, HEADER_H, DAY_COL_W - borderW, DAY_HEADER_H);

    // Day name
    ctx.fillStyle = "#444444";
    ctx.font = `bold 9px ${FONT_STACK}`;
    ctx.textBaseline = "top";
    ctx.fillText(DAY_NAMES[(day.getDay() + 6) % 7], x + borderW + 3, HEADER_H + 3);

    // Date number
    ctx.fillStyle = "#000000";
    ctx.font = `${isToday ? "bold" : "normal"} 16px ${FONT_STACK}`;
    ctx.textBaseline = "bottom";
    ctx.fillText(String(day.getDate()), x + borderW + 3, HEADER_H + DAY_HEADER_H - 2);

    // Week badge on Monday
    if (isMonday) {
      ctx.fillStyle = "#000000";
      ctx.fillRect(x + borderW, HEADER_H, 28, 14);
      ctx.fillStyle = "#ffdd00";
      ctx.font = `bold 11px ${FONT_STACK}`;
      ctx.textBaseline = "top";
      ctx.fillText(`V${getISOWeek(day)}`, x + borderW + 2, HEADER_H + 1);
    }

    // Bottom border of day header
    ctx.fillStyle = "#000000";
    ctx.fillRect(x + borderW, HEADER_H + DAY_HEADER_H - 1, DAY_COL_W - borderW, 1);

    // ── All-day rows (one per calendar)
    for (let ci = 0; ci < 2; ci++) {
      const evs    = ci === 0 ? events1 : events2;
      const cal    = ci === 0 ? cal1 : cal2;
      const rowTop = HEADER_H + DAY_HEADER_H + ci * ALLDAY_ROW_H;

      ctx.fillStyle = "#ffffff";
      ctx.fillRect(x + borderW, rowTop, DAY_COL_W - borderW, ALLDAY_ROW_H);

      const allDay = getAllDayEvents(day, evs);
      if (allDay.length > 0) {
        const ev  = allDay[0];
        const bg  = ev.color ?? cal.color;
        const fg  = ev.textColor ?? "#ffffff";
        ctx.fillStyle = bg;
        ctx.fillRect(x + borderW + 1, rowTop + 2, DAY_COL_W - borderW - 2, ALLDAY_ROW_H - 4);
        ctx.fillStyle = fg;
        ctx.font = `bold 8px ${FONT_STACK}`;
        ctx.textBaseline = "middle";
        let title = ev.title;
        const suffix = allDay.length > 1 ? "…" : "";
        while (title.length > 0 && ctx.measureText(title + suffix).width > DAY_COL_W - borderW - 6)
          title = title.slice(0, -1);
        ctx.fillText(title + suffix, x + borderW + 3, rowTop + ALLDAY_ROW_H / 2);
      }

      // Row bottom border
      ctx.fillStyle = "#000000";
      ctx.fillRect(x + borderW, rowTop + ALLDAY_ROW_H - 1, DAY_COL_W - borderW, 1);
    }
  }

  // ── Time column
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, HEADER_H, TIME_COL_W, H - HEADER_H);

  // Calendar label stubs
  for (let ci = 0; ci < 2; ci++) {
    const cal    = ci === 0 ? cal1 : cal2;
    const rowTop = HEADER_H + DAY_HEADER_H + ci * ALLDAY_ROW_H;
    ctx.fillStyle = cal.color;
    ctx.fillRect(0, rowTop, TIME_COL_W, ALLDAY_ROW_H);
    ctx.fillStyle = "#ffffff";
    ctx.font = `bold 8px ${FONT_STACK}`;
    ctx.textBaseline = "middle";
    ctx.fillText(cal.name.slice(0, 3).toUpperCase(), 4, rowTop + ALLDAY_ROW_H / 2);
    ctx.fillStyle = "#000000";
    ctx.fillRect(0, rowTop + ALLDAY_ROW_H - 1, W, 1);
  }

  // ── Hour grid
  for (let hi = 0; hi < HOURS.length; hi++) {
    const y = GRID_TOP + hi * PX_PER_HOUR;
    ctx.fillStyle = "#dddddd";
    ctx.fillRect(TIME_COL_W, y, W - TIME_COL_W, 1);
    ctx.fillStyle = "#555555";
    ctx.font = `11px ${FONT_STACK}`;
    ctx.textBaseline = "top";
    ctx.fillText(`${String(HOURS[hi]).padStart(2, "0")}:00`, 2, y + 1);
  }

  // ── Timed events
  const LINE_H = 12;

  for (let i = 0; i < 7; i++) {
    const day      = weekDays[i];
    const x        = TIME_COL_W + i * DAY_COL_W;
    const isMonday = day.getDay() === 1;
    const bw       = isMonday ? 3 : 1;
    const halfW    = Math.floor(DAY_COL_W / 2) - 1;

    const pairs: [CalEvent[], number, CalConfig][] = [
      [getTimedEvents(day, events1), x + bw,          cal1],
      [getTimedEvents(day, events2), x + Math.floor(DAY_COL_W / 2) + 1, cal2],
    ];

    for (const [evList, evX, cal] of pairs) {
      for (const ev of evList) {
        const start    = new Date(ev.start);
        const end      = new Date(ev.end);
        const startMin = start.getHours() * 60 + start.getMinutes();
        const endMin   = end.getHours()   * 60 + end.getMinutes();
        const gridMin  = HOUR_START * 60;
        const totalMin = (HOUR_END - HOUR_START) * 60;
        const topPct   = Math.max(0, Math.min(1, (startMin - gridMin) / totalMin));
        const botPct   = Math.max(0, Math.min(1, (endMin   - gridMin) / totalMin));
        if (botPct <= topPct) continue;

        const evTop = GRID_TOP + topPct * GRID_H;
        const evH   = Math.max(6, (botPct - topPct) * GRID_H);
        const bg    = ev.color ?? cal.color;
        const fg    = ev.textColor ?? "#ffffff";

        ctx.fillStyle = bg;
        ctx.fillRect(evX, evTop, halfW - 1, evH);

        if (evH > 10) {
          ctx.fillStyle = fg;
          ctx.textBaseline = "top";

          const totalLines = Math.floor((evH - 2) / LINE_H);
          const titleLines = Math.max(1, totalLines - 1);

          // Draw title with line-wrapping, clamped to titleLines
          const words = ev.title.split(" ");
          let line = "", lineY = evTop + 2, drawn = 0;
          ctx.font = `bold 9px ${FONT_STACK}`;
          for (const word of words) {
            const test = line ? `${line} ${word}` : word;
            if (ctx.measureText(test).width > halfW - 4 && line) {
              if (drawn >= titleLines - 1) {
                ctx.fillText(line + "…", evX + 1, lineY);
                line = ""; break;
              }
              ctx.fillText(line, evX + 1, lineY);
              line = word; lineY += LINE_H; drawn++;
            } else { line = test; }
          }
          if (line) ctx.fillText(line, evX + 1, lineY);

          // Start time on last line
          if (totalLines >= 2) {
            ctx.font = `9px ${FONT_STACK}`;
            const timeStr = start.toLocaleTimeString("sv-SE", { hour: "2-digit", minute: "2-digit" });
            ctx.fillText(timeStr, evX + 1, evTop + evH - LINE_H);
          }
        }

        // Bottom separator
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(evX, evTop + evH - 1, halfW - 1, 1);
      }
    }
  }

  // Outer borders
  ctx.fillStyle = "#000000";
  ctx.fillRect(0, H - 1, W, 1);
  ctx.fillRect(W - 1, GRID_TOP, 1, GRID_H);
}

// ─── Route handler ────────────────────────────────────────────────────────────
export async function GET(request: NextRequest) {
  const key = request.nextUrl.searchParams.get("key");
  const debug = request.nextUrl.searchParams.get("debug") === "1";
  if (!key || key !== process.env.ESP32_API_KEY)
    return new NextResponse("Unauthorized", { status: 401 });

  try {
    const fontSource = await ensureFonts();
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

    const canvas = createCanvas(W, H);
    renderCalendar(canvas.getContext("2d"), today, cal1, events1, cal2, events2);

    if (debug) {
      const png = await canvas.encode("png");
      const pngBytes = Uint8Array.from(png);
      return new NextResponse(pngBytes, {
        headers: {
          "Content-Type": "image/png",
          "Cache-Control": "no-store",
          "X-WallCalendar-Font-Source": fontSource,
        },
      });
    }

    const { data: rgba } = canvas.getContext("2d").getImageData(0, 0, W, H);
    const packed = new Uint8Array(W / 2 * H);
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x += 2) {
        const i0 = (y * W + x) * 4;
        const c0 = nearestEinkIndex(rgba[i0],   rgba[i0+1], rgba[i0+2]);
        const c1 = nearestEinkIndex(rgba[i0+4], rgba[i0+5], rgba[i0+6]);
        packed[y * (W / 2) + x / 2] = (c0 << 4) | c1;
      }
    }

    return new NextResponse(packed, {
      headers: {
        "Content-Type": "application/octet-stream",
        "Content-Length": String(packed.length),
        "Cache-Control": "no-store",
        "X-WallCalendar-Font-Source": fontSource,
      },
    });
  } catch (err: any) {
    console.error("Bitmap render error:", err);
    return new NextResponse(err.message ?? "Internal error", { status: 500 });
  }
}

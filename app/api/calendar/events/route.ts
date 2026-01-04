import { NextRequest, NextResponse } from "next/server";
import { google } from "googleapis";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

// Google Calendar event color IDs mapped to hex colors
const EVENT_COLORS: Record<string, { background: string; foreground: string }> = {
  "1": { background: "#7986cb", foreground: "#1d1d1d" },  // Lavender
  "2": { background: "#33b679", foreground: "#ffffff" },  // Sage
  "3": { background: "#8e24aa", foreground: "#ffffff" },  // Grape
  "4": { background: "#e67c73", foreground: "#ffffff" },  // Flamingo
  "5": { background: "#f6bf26", foreground: "#1d1d1d" },  // Banana
  "6": { background: "#f4511e", foreground: "#ffffff" },  // Tangerine
  "7": { background: "#039be5", foreground: "#ffffff" },  // Peacock
  "8": { background: "#616161", foreground: "#ffffff" },  // Graphite
  "9": { background: "#3f51b5", foreground: "#ffffff" },  // Blueberry
  "10": { background: "#0b8043", foreground: "#ffffff" }, // Basil
  "11": { background: "#d60000", foreground: "#ffffff" }, // Tomato
};

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.accessToken) {
      return NextResponse.json(
        { error: "Not authenticated" },
        { status: 401 }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const calendarId = searchParams.get("calendarId");
    const year = searchParams.get("year");
    const month = searchParams.get("month");

    if (!calendarId) {
      return NextResponse.json(
        { error: "Calendar ID is required" },
        { status: 400 }
      );
    }

    const oauth2Client = new google.auth.OAuth2();
    oauth2Client.setCredentials({
      access_token: session.accessToken,
    });

    const calendar = google.calendar({ version: "v3", auth: oauth2Client });

    const now = new Date();
    const targetYear = year ? parseInt(year) : now.getFullYear();
    const targetMonth = month ? parseInt(month) : now.getMonth();

    const timeMin = new Date(targetYear, targetMonth, 1).toISOString();
    const timeMax = new Date(targetYear, targetMonth + 1, 0).toISOString();

    const response = await calendar.events.list({
      calendarId,
      timeMin,
      timeMax,
      singleEvents: true,
      orderBy: "startTime",
    });

    const events = response.data.items?.map((event) => {
      const colorId = event.colorId;
      const eventColor = colorId ? EVENT_COLORS[colorId] : null;
      
      return {
        id: event.id,
        title: event.summary || "No title",
        start: event.start?.dateTime || event.start?.date,
        end: event.end?.dateTime || event.end?.date,
        allDay: !event.start?.dateTime,
        colorId: colorId || null,
        color: eventColor?.background || null,
        textColor: eventColor?.foreground || null,
      };
    }) || [];

    return NextResponse.json({ events });
  } catch (error: any) {
    console.error("Calendar API error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch calendar events" },
      { status: 500 }
    );
  }
}

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getToken } from "next-auth/jwt";
import { NextRequest } from "next/server";

// Temporary endpoint — visit this while logged in to get the values
// you need to add as Vercel env vars. Delete this file afterwards.
export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Not logged in" }, { status: 401 });
  }

  const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });

  return NextResponse.json({
    message: "Copy these values into your Vercel environment variables, then delete this endpoint.",
    vars: {
      GOOGLE_REFRESH_TOKEN: token?.refreshToken ?? "⚠️ Not found — sign out and sign in again",
      CALENDAR_1_ID: "primary",
      CALENDAR_2_ID: "— paste your second calendar ID here (from the settings page on the main app)",
    },
  });
}

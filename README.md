# Wall Calendar

A Next.js application that displays two Google Calendars side-by-side with OAuth authentication. Perfect for displaying on a wall-mounted screen or secondary monitor.

## Features

- View two Google Calendars simultaneously
- OAuth 2.0 authentication with Google
- Month, week, and day views
- Responsive design with Tailwind CSS
- Built with Next.js 16 and NextAuth.js

## Prerequisites

- Node.js 18+ installed
- A Google Cloud Project with Calendar API enabled
- Google OAuth 2.0 credentials

## Setup Instructions

### 1. Google Cloud Console Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the Google Calendar API:
   - Navigate to "APIs & Services" > "Library"
   - Search for "Google Calendar API"
   - Click "Enable"
4. Configure OAuth consent screen:
   - Navigate to "APIs & Services" > "OAuth consent screen"
   - Choose "External" user type (or "Internal" if using Google Workspace)
   - Fill in the required information
   - Add the scope: `https://www.googleapis.com/auth/calendar.readonly`
5. Create OAuth 2.0 credentials:
   - Navigate to "APIs & Services" > "Credentials"
   - Click "Create Credentials" > "OAuth client ID"
   - Choose "Web application"
   - Add authorized redirect URI: `http://localhost:3000/api/auth/callback/google`
   - Copy the Client ID and Client Secret

### 2. Find Your Calendar IDs

**Primary Calendar:**
- Usually your Gmail address (e.g., `yourname@gmail.com`)

**Secondary Calendar:**
1. Open [Google Calendar](https://calendar.google.com/)
2. Find the calendar in the left sidebar
3. Click the three dots next to it > "Settings and sharing"
4. Scroll to "Integrate calendar" section
5. Copy the "Calendar ID"

### 3. Environment Variables

1. Copy the example environment file:
```bash
cp .env.example .env.local
```

2. Edit `.env.local` and fill in your values:

```env
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-secret-here

GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
```

To generate a secure `NEXTAUTH_SECRET`:
```bash
openssl rand -base64 32
```

### 4. Install Dependencies and Run

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) and sign in with your Google account.

## Project Structure

```
wallcalendar/
├── app/
│   ├── api/
│   │   ├── auth/[...nextauth]/  # NextAuth.js route handler
│   │   └── calendar/events/     # Calendar events API
│   ├── layout.tsx               # Root layout with SessionProvider
│   └── page.tsx                 # Main page with authentication

### 5. Configure Your Calendars

After signing in:
1. Click the settings icon (⚙️) in the top-right corner
2. Enter your primary and secondary calendar IDs
3. Customize the calendar names and colors if desired
4. Click "Save Settings"

Your configuration will be saved locally and persist across sessions.
├── components/
│   ├── DualCalendar.tsx         # Calendar component
│   └── SessionProvider.tsx      # NextAuth session provider
├── lib/
│   └── auth.ts                  # NextAuth configuration
└── types/
    └── next-auth.d.ts           # NextAuth TypeScript types
```

## Tech Stack

- **Next.js 16** - React framework with App Router
- **React 19** - UI library
- **NextAuth.js 4** - Authentication
- **Tailwind CSS 4** - Styling
- **Google Calendar API** - Calendar data via googleapis
- **TypeScript 5** - Type safety
- **Playwright** - End-to-end testing
Usage

### Viewing Options
- Toggle between **week** and **month** views using the buttons in the header
- Navigate months using the ◀ and ▶ arrows

### Settings
Click the ⚙️ settings icon to:
- Change calendar IDs
- Customize calendar names
- Pick custom colors for each calendar
- Settings are saved locally and persist across sessions

## Troubleshooting

**"Not authenticated" error:**
- Make sure you've signed in with Google
- Check that your OAuth credentials are correct in `.env.local`

**"Failed to fetch calendar events" error:**
- Verify the Calendar API is enabled in Google Cloud Console
- Check that the calendar IDs are correct
- Ensure the calendar is shared with your Google account

**Calendar not showing events:**
- Verify the calendar scope `https://www.googleapis.com/auth/calendar.readonly` is included in the OAuth consent screen
- Try signing out and signing in again to refresh the access token
- Check browser console for any error messages

**Settings not saving:**
- Check that localStorage is enabled in your browser
- Try clearing browser cache and reconfiguringn
- Try signing out and signing in again to refresh the access token

## Deployment

When deploying to production:

1. Update `NEXTAUTH_URL` in your environment variables to your production URL
2. Add your production URL to the authorized redirect URIs in Google Cloud Console
3. Deploy to Vercel, Netlify, or your preferred hosting platform

## License

MIT

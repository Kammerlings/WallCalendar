"use client";

import { useSession, signIn, signOut } from "next-auth/react";
import { useState } from "react";
import DualCalendar from "@/components/DualCalendar";

export default function Home() {
  const { data: session, status } = useSession();
  const [isSigningIn, setIsSigningIn] = useState(false);

  const handleSignIn = async () => {
    setIsSigningIn(true);
    try {
      await signIn("google");
    } catch (error) {
      setIsSigningIn(false);
    }
  };

  if (status === "loading") {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center space-y-4">
          <div className="inline-block">
            <div className="w-12 h-12 border-4 border-[var(--accent-amber)] border-t-transparent rounded-full animate-spin" />
          </div>
          <p className="text-[var(--foreground-muted)] animate-fadeIn" style={{ animationDelay: '200ms' }}>
            Loading your calendars...
          </p>
        </div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="min-h-screen relative overflow-hidden">
        {/* Decorative background */}
        <div className="absolute inset-0 pointer-events-none">
          <div
            className="absolute top-0 right-0 w-[600px] h-[600px] rounded-full opacity-10"
            style={{
              background: 'radial-gradient(circle, var(--accent-amber) 0%, transparent 70%)',
              transform: 'translate(30%, -30%)',
            }}
          />
          <div
            className="absolute bottom-0 left-0 w-[500px] h-[500px] rounded-full opacity-10"
            style={{
              background: 'radial-gradient(circle, var(--accent-sage) 0%, transparent 70%)',
              transform: 'translate(-30%, 30%)',
            }}
          />
        </div>

        {/* Main content */}
        <div className="relative flex flex-col items-center justify-center min-h-screen px-4 py-12">
          <main className="w-full max-w-[520px] space-y-8 animate-fadeIn">
            {/* Header */}
            <header className="text-center space-y-4" style={{ animationDelay: '100ms' }}>
              <div className="inline-block mb-2">
                <div
                  className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl"
                  style={{
                    background: 'linear-gradient(135deg, var(--accent-amber) 0%, var(--accent-coral) 100%)',
                    boxShadow: 'var(--shadow-lg)',
                  }}
                  aria-hidden="true"
                >
                  📅
                </div>
              </div>
              <h1 className="text-balance" style={{ fontFamily: 'var(--font-display)' }}>
                Wall Calendar
              </h1>
              <p
                className="text-lg text-[var(--foreground-muted)] text-pretty max-w-md mx-auto"
                style={{ fontFamily: 'var(--font-body)' }}
              >
                View two Google Calendars side-by-side. Perfect for managing work and personal schedules, or coordinating with your team.
              </p>
            </header>

            {/* Sign in card */}
            <div
              className="animate-slideInUp"
              style={{
                animationDelay: '200ms',
                background: 'var(--surface)',
                borderRadius: 'var(--radius-xl)',
                boxShadow: 'var(--shadow-xl)',
                padding: 'var(--space-2xl)',
                border: '1px solid var(--border)',
              }}
            >
              <div className="space-y-6">
                <div className="space-y-2">
                  <h2
                    className="text-2xl font-semibold"
                    style={{ fontFamily: 'var(--font-display)' }}
                  >
                    Get Started
                  </h2>
                  <p className="text-[var(--foreground-muted)]">
                    Sign in with your Google account to access your calendars
                  </p>
                </div>

                <button
                  onClick={handleSignIn}
                  disabled={isSigningIn}
                  aria-label="Sign in with Google"
                  className="w-full group relative overflow-hidden disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{
                    background: 'linear-gradient(135deg, var(--accent-amber) 0%, var(--accent-coral) 100%)',
                    color: 'white',
                    padding: '1rem 2rem',
                    borderRadius: 'var(--radius-lg)',
                    border: 'none',
                    fontSize: '16px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    transition: 'all var(--transition-base)',
                    boxShadow: '0 4px 12px rgb(245 158 11 / 0.3)',
                  }}
                  onMouseEnter={(e) => {
                    if (!isSigningIn) {
                      e.currentTarget.style.transform = 'translateY(-2px)';
                      e.currentTarget.style.boxShadow = '0 8px 20px rgb(245 158 11 / 0.4)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = '0 4px 12px rgb(245 158 11 / 0.3)';
                  }}
                >
                  <span className="flex items-center justify-center gap-3">
                    {isSigningIn ? (
                      <>
                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        <span>Signing in...</span>
                      </>
                    ) : (
                      <>
                        <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
                          <path d="M19.6 10.227c0-.709-.064-1.39-.182-2.045H10v3.868h5.382a4.6 4.6 0 01-1.996 3.018v2.51h3.232c1.891-1.742 2.982-4.305 2.982-7.35z" fill="#4285F4"/>
                          <path d="M10 20c2.7 0 4.964-.895 6.618-2.423l-3.232-2.509c-.895.6-2.04.955-3.386.955-2.605 0-4.81-1.76-5.595-4.123H1.064v2.59A9.996 9.996 0 0010 20z" fill="#34A853"/>
                          <path d="M4.405 11.9c-.2-.6-.314-1.24-.314-1.9 0-.66.114-1.3.314-1.9V5.51H1.064A9.996 9.996 0 000 10c0 1.614.386 3.14 1.064 4.49l3.34-2.59z" fill="#FBBC05"/>
                          <path d="M10 3.977c1.468 0 2.786.505 3.823 1.496l2.868-2.868C14.959.99 12.695 0 10 0 6.09 0 2.71 2.24 1.064 5.51l3.34 2.59C5.19 5.736 7.395 3.977 10 3.977z" fill="#EA4335"/>
                        </svg>
                        <span>Sign in with Google</span>
                      </>
                    )}
                  </span>
                </button>

                <div className="pt-4 border-t border-[var(--border)]">
                  <details className="group">
                    <summary
                      className="cursor-pointer text-sm text-[var(--foreground-muted)] hover:text-[var(--foreground)] transition-colors list-none flex items-center justify-between"
                      aria-label="Show privacy information"
                    >
                      <span>Privacy & Permissions</span>
                      <svg
                        width="16"
                        height="16"
                        viewBox="0 0 16 16"
                        fill="none"
                        className="transition-transform group-open:rotate-180"
                        aria-hidden="true"
                      >
                        <path d="M4 6L8 10L12 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </summary>
                    <div className="mt-3 text-sm text-[var(--foreground-muted)] space-y-2 pl-1">
                      <p>We only request read-only access to your Google Calendar data.</p>
                      <p>Your calendar information is never stored on our servers and is only used to display your events.</p>
                    </div>
                  </details>
                </div>
              </div>
            </div>

            {/* Features */}
            <div className="grid gap-4 md:grid-cols-3 text-center animate-fadeIn" style={{ animationDelay: '400ms' }}>
              <div className="space-y-2">
                <div className="text-2xl" aria-hidden="true">⚡</div>
                <p className="text-sm font-medium">Fast & Responsive</p>
              </div>
              <div className="space-y-2">
                <div className="text-2xl" aria-hidden="true">🔒</div>
                <p className="text-sm font-medium">Private & Secure</p>
              </div>
              <div className="space-y-2">
                <div className="text-2xl" aria-hidden="true">📱</div>
                <p className="text-sm font-medium">Works Everywhere</p>
              </div>
            </div>
          </main>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header
        className="sticky top-0 z-50 backdrop-blur-lg"
        style={{
          background: 'rgba(250, 248, 245, 0.8)',
          borderBottom: '1px solid var(--border)',
          boxShadow: 'var(--shadow-sm)',
        }}
      >
        <div className="max-w-[1800px] mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center text-xl"
                style={{
                  background: 'linear-gradient(135deg, var(--accent-amber) 0%, var(--accent-coral) 100%)',
                }}
                aria-hidden="true"
              >
                📅
              </div>
              <h1
                className="text-xl sm:text-2xl font-semibold"
                style={{ fontFamily: 'var(--font-body)' }}
              >
                Wall Calendar
              </h1>
            </div>

            <div className="flex items-center gap-3 sm:gap-4">
              <span className="hidden sm:inline text-sm text-[var(--foreground-muted)] truncate max-w-[200px]">
                {session.user?.email}
              </span>
              <button
                onClick={() => signOut()}
                aria-label="Sign out of your account"
                className="group"
                style={{
                  background: 'var(--surface)',
                  color: 'var(--foreground)',
                  padding: '0.625rem 1.25rem',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border)',
                  fontSize: '14px',
                  fontWeight: 500,
                  cursor: 'pointer',
                  transition: 'all var(--transition-fast)',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'var(--foreground)';
                  e.currentTarget.style.color = 'var(--surface)';
                  e.currentTarget.style.borderColor = 'var(--foreground)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'var(--surface)';
                  e.currentTarget.style.color = 'var(--foreground)';
                  e.currentTarget.style.borderColor = 'var(--border)';
                }}
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1">
        <DualCalendar />
      </main>
    </div>
  );
}

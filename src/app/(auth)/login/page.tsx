"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [magicLinkSent, setMagicLinkSent] = useState(false);
  const [authMode, setAuthMode] = useState<"password" | "magic">("password");
  const [error, setError] = useState<string | null>(null);

  const router = useRouter();
  const supabase = createClient();

  async function handleGoogleLogin() {
    setLoading(true);
    setError(null);
    const { error: oauthError } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/callback`,
      },
    });
    if (oauthError) {
      setError(oauthError.message);
      setLoading(false);
    }
  }

  async function handlePasswordLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (authError) {
      setError(authError.message);
      setLoading(false);
      return;
    }

    router.push("/dashboard");
  }

  async function handleMagicLink(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { error: authError } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/callback`,
      },
    });

    if (authError) {
      setError(authError.message);
      setLoading(false);
      return;
    }

    setMagicLinkSent(true);
    setLoading(false);
  }

  const inputClass =
    "mt-1.5 block w-full rounded-md border border-border bg-surface px-3.5 py-2.5 text-sm text-ink placeholder:text-muted-foreground focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20 transition-colors";

  return (
    <div className="flex min-h-screen items-center justify-center bg-paper px-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="mb-10 text-center">
          <h1 className="font-serif text-4xl font-bold tracking-tight text-ink">
            Probeklausur
          </h1>
          <p className="mt-2 font-sans text-sm text-ink-muted">
            KI-gestützte Prüfungsvorbereitung
          </p>
        </div>

        {/* Card */}
        <div className="rounded-lg border border-border bg-surface p-8 shadow-sm">
          {magicLinkSent ? (
            <div className="text-center">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-accent-light">
                <svg className="h-6 w-6 text-accent" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
                </svg>
              </div>
              <h2 className="font-serif text-xl font-semibold text-ink">
                Link gesendet
              </h2>
              <p className="mt-2 text-sm text-ink-muted">
                Wir haben einen Magic Link an{" "}
                <span className="font-medium text-ink">{email}</span> gesendet.
                Prüfe deinen Posteingang.
              </p>
              <button
                onClick={() => { setMagicLinkSent(false); setEmail(""); }}
                className="mt-6 text-sm font-medium text-accent hover:text-accent-hover transition-colors"
              >
                Andere E-Mail verwenden
              </button>
            </div>
          ) : (
            <>
              <h2 className="font-serif text-xl font-semibold text-ink">
                Anmelden
              </h2>
              <p className="mt-1 text-sm text-ink-muted">
                Melde dich mit deinem Konto an oder erstelle ein neues.
              </p>

              {/* Google OAuth */}
              <button
                type="button"
                onClick={handleGoogleLogin}
                disabled={loading}
                className="mt-6 flex w-full items-center justify-center gap-3 rounded-md border border-border bg-surface px-4 py-2.5 text-sm font-medium text-ink shadow-sm transition-colors hover:bg-muted disabled:opacity-50"
              >
                <svg className="h-5 w-5" viewBox="0 0 24 24">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                </svg>
                Mit Google anmelden
              </button>

              {/* Divider */}
              <div className="relative my-6">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-border" />
                </div>
                <div className="relative flex justify-center">
                  <span className="bg-surface px-3 text-xs text-muted-foreground">
                    oder
                  </span>
                </div>
              </div>

              {/* Auth mode tabs */}
              <div className="mb-4 flex rounded-lg border border-border bg-muted p-0.5">
                <button
                  type="button"
                  onClick={() => setAuthMode("password")}
                  className={`flex-1 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                    authMode === "password"
                      ? "bg-surface text-ink shadow-sm"
                      : "text-muted-foreground hover:text-ink"
                  }`}
                >
                  E-Mail & Passwort
                </button>
                <button
                  type="button"
                  onClick={() => setAuthMode("magic")}
                  className={`flex-1 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                    authMode === "magic"
                      ? "bg-surface text-ink shadow-sm"
                      : "text-muted-foreground hover:text-ink"
                  }`}
                >
                  Magic Link
                </button>
              </div>

              <form
                onSubmit={authMode === "password" ? handlePasswordLogin : handleMagicLink}
                className="space-y-4"
              >
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-ink">
                    E-Mail
                  </label>
                  <input
                    id="email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@universität.de"
                    className={inputClass}
                  />
                </div>

                {authMode === "password" && (
                  <div>
                    <label htmlFor="password" className="block text-sm font-medium text-ink">
                      Passwort
                    </label>
                    <input
                      id="password"
                      type="password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Dein Passwort"
                      className={inputClass}
                    />
                  </div>
                )}

                {error && <p className="text-sm text-incorrect">{error}</p>}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full rounded-md bg-accent px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-accent-hover focus:outline-none focus:ring-2 focus:ring-accent/20 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {loading
                    ? "Wird geladen..."
                    : authMode === "password"
                    ? "Anmelden"
                    : "Magic Link senden"}
                </button>
              </form>
            </>
          )}
        </div>

        {/* Footer */}
        <p className="mt-6 text-center text-sm text-muted-foreground">
          Noch kein Konto?{" "}
          <Link href="/register" className="font-medium text-accent hover:text-accent-hover transition-colors">
            Registrieren
          </Link>
        </p>
      </div>
    </div>
  );
}

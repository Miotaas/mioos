"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Brain, Eye, EyeOff, LogIn } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw]     = useState(false);
  const [error, setError]       = useState("");
  const [loading, setLoading]   = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      if (res.ok) {
        const params = new URLSearchParams(window.location.search);
        const from   = params.get("from") ?? "/";
        router.push(from.startsWith("/") ? from : "/");
      } else {
        const data = await res.json() as { error?: string };
        if (res.status === 429) {
          setError("Too many attempts — please wait 15 minutes.");
        } else {
          setError(data.error ?? "Invalid credentials");
        }
      }
    } catch {
      setError("Connection error — please try again.");
    } finally {
      setLoading(false);
    }
  }

  const inputCls =
    "w-full text-sm bg-surface-3 border border-white/[0.08] rounded-xl px-4 py-3 text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent-cyan/50 transition-colors";

  return (
    <div className="h-full flex items-center justify-center p-4 bg-void">
      <div className="w-full max-w-sm">

        {/* Branding */}
        <div className="flex items-center justify-center gap-3 mb-8">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-accent-purple to-accent-violet flex items-center justify-center shadow-glow">
            <Brain className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-text-primary leading-none">MioOS</h1>
            <p className="text-[11px] text-text-muted mt-0.5">Business Operating System</p>
          </div>
        </div>

        {/* Card */}
        <div className="bg-surface-1 border border-white/[0.08] rounded-2xl p-6 shadow-2xl">
          <p className="text-sm font-semibold text-text-primary mb-1">Sign in</p>
          <p className="text-xs text-text-muted mb-5">Private access — owner only</p>

          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <label className="text-xs text-text-muted block mb-1.5" htmlFor="username">
                Username
              </label>
              <input
                id="username"
                type="text"
                autoFocus
                autoComplete="username"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="username"
                className={inputCls}
              />
            </div>

            <div>
              <label className="text-xs text-text-muted block mb-1.5" htmlFor="password">
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPw ? "text" : "password"}
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className={`${inputCls} pr-11`}
                />
                <button
                  type="button"
                  tabIndex={-1}
                  onClick={() => setShowPw((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-secondary transition-colors p-1"
                  aria-label={showPw ? "Hide password" : "Show password"}
                >
                  {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {error && (
              <div className="text-xs text-accent-red bg-accent-red/[0.08] border border-accent-red/20 rounded-xl px-3 py-2.5">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading || !username.trim() || !password}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-accent-cyan text-void text-sm font-semibold disabled:opacity-40 transition-all active:scale-[0.98] mt-1"
            >
              <LogIn className="w-4 h-4" />
              {loading ? "Signing in…" : "Sign in"}
            </button>
          </form>
        </div>

        <p className="text-center text-[10px] text-text-ghost mt-4">
          MioOS · Private Instance
        </p>
      </div>
    </div>
  );
}

"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";

type AuthTab = "password" | "otp";
type OtpStep = "idle" | "sent";

export default function LoginPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<AuthTab>("password");

  // Password state
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // Email OTP state
  const [otpEmail, setOtpEmail] = useState("");
  const [otpStep, setOtpStep] = useState<OtpStep>("idle");
  const [otpCode, setOtpCode] = useState(["", "", "", "", "", ""]);
  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Shared state
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState("");

  // ─── Password Login ────────────────────────────────────────
  const handlePasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const { error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (authError) {
      setError(authError.message);
      setLoading(false);
    } else {
      router.refresh();
      router.push("/onboarding");
    }
  };

  // ─── Email OTP: Send Code ──────────────────────────────────
  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);

    try {
      const res = await fetch("/api/otp/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: otpEmail }),
      });
      const body = await res.json();

      if (!res.ok) {
        setError(body.error || "Failed to send OTP");
      } else {
        setOtpStep("sent");
        setSuccess("OTP sent! Check your email for the 6-digit code.");
      }
    } catch {
      setError("Network error. Please try again.");
    }
    setLoading(false);
  };

  // ─── Email OTP: Verify Code ────────────────────────────────
  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);

    const token = otpCode.join("");
    if (token.length !== 6) {
      setError("Please enter the full 6-digit code.");
      setLoading(false);
      return;
    }

    try {
      /* Step 1: Verify OTP with our custom API */
      const res = await fetch("/api/otp/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: otpEmail, otp: token }),
      });
      const body = await res.json();

      if (!res.ok) {
        setError(body.error || "Verification failed");
        setLoading(false);
        return;
      }

      /* Step 2: Use the token_hash to create a Supabase session */
      const { error: verifyError } = await supabase.auth.verifyOtp({
        token_hash: body.token_hash,
        type: "magiclink",
      });

      if (verifyError) {
        setError(verifyError.message);
        setLoading(false);
      } else {
        router.refresh();
        router.push("/onboarding");
      }
    } catch {
      setError("Network error. Please try again.");
      setLoading(false);
    }
  };

  // ─── OTP Input Helpers ─────────────────────────────────────
  const handleOtpChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;
    const newOtp = [...otpCode];
    newOtp[index] = value.slice(-1);
    setOtpCode(newOtp);
    if (value && index < 5) {
      otpRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (
    index: number,
    e: React.KeyboardEvent<HTMLInputElement>
  ) => {
    if (e.key === "Backspace" && !otpCode[index] && index > 0) {
      otpRefs.current[index - 1]?.focus();
    }
  };

  const handleOtpPaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    const newOtp = [...otpCode];
    for (let i = 0; i < 6; i++) {
      newOtp[i] = pasted[i] || "";
    }
    setOtpCode(newOtp);
    const focusIdx = Math.min(pasted.length, 5);
    otpRefs.current[focusIdx]?.focus();
  };

  // ─── Google Sign-In ────────────────────────────────────────
  const handleGoogleSignIn = async () => {
    setError("");
    setLoading(true);

    const { error: oauthError } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (oauthError) {
      setError(oauthError.message);
      setLoading(false);
    }
  };

  // ─── Reset when switching tabs ─────────────────────────────
  const switchTab = (tab: AuthTab) => {
    setActiveTab(tab);
    setError("");
    setSuccess("");
    setOtpStep("idle");
    setOtpCode(["", "", "", "", "", ""]);
  };

  return (
    <div className="w-full max-w-[440px] rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-8 shadow-sm">
      <div className="mb-6">
        <h2 className="text-2xl font-bold leading-tight tracking-tight text-slate-900 dark:text-white">
          Welcome Back
        </h2>
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
          Sign in to access your dashboard.
        </p>
      </div>

      {/* ── Google Sign-In ─────────────────────────────────── */}
      <button
        type="button"
        onClick={handleGoogleSignIn}
        disabled={loading}
        className="flex w-full items-center justify-center gap-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 py-3 text-sm font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-all disabled:opacity-50"
      >
        <svg className="h-5 w-5" viewBox="0 0 24 24">
          <path
            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
            fill="#4285F4"
          />
          <path
            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            fill="#34A853"
          />
          <path
            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
            fill="#FBBC05"
          />
          <path
            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
            fill="#EA4335"
          />
        </svg>
        Sign in with Google
      </button>

      {/* ── Divider ────────────────────────────────────────── */}
      <div className="relative my-6">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-slate-200 dark:border-slate-700"></div>
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-white dark:bg-slate-900 px-2 text-slate-400">
            or continue with
          </span>
        </div>
      </div>

      {/* ── Auth Tabs ──────────────────────────────────────── */}
      <div className="mb-5 flex rounded-lg bg-slate-100 dark:bg-slate-800 p-1">
        <button
          type="button"
          onClick={() => switchTab("password")}
          className={`flex-1 rounded-md py-2 text-xs font-semibold transition-all ${activeTab === "password"
            ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm"
            : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300"
            }`}
        >
          <span className="material-symbols-outlined text-[16px] align-middle mr-1">
            lock
          </span>
          Password
        </button>
        <button
          type="button"
          onClick={() => switchTab("otp")}
          className={`flex-1 rounded-md py-2 text-xs font-semibold transition-all ${activeTab === "otp"
            ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm"
            : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300"
            }`}
        >
          <span className="material-symbols-outlined text-[16px] align-middle mr-1">
            mail
          </span>
          Email OTP
        </button>
      </div>

      {/* ── Password Form ──────────────────────────────────── */}
      {activeTab === "password" && (
        <form onSubmit={handlePasswordLogin} className="space-y-5">
          {/* Email */}
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="email"
              className="text-sm font-medium text-slate-900 dark:text-white"
            >
              Email Address
            </label>
            <div className="relative">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5">
                <span className="material-symbols-outlined text-slate-400 text-[20px]">
                  mail
                </span>
              </div>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="name@company.com"
                className="block w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 py-3 pl-11 pr-4 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none"
              />
            </div>
          </div>

          {/* Password */}
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="password"
              className="text-sm font-medium text-slate-900 dark:text-white"
            >
              Password
            </label>
            <div className="relative">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5">
                <span className="material-symbols-outlined text-slate-400 text-[20px]">
                  lock
                </span>
              </div>
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="••••••••"
                className="block w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 py-3 pl-11 pr-11 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 hover:text-slate-900 dark:hover:text-white"
              >
                <span className="material-symbols-outlined text-[20px]">
                  {showPassword ? "visibility_off" : "visibility"}
                </span>
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="flex w-full items-center justify-center rounded-lg bg-primary px-4 py-3 text-sm font-bold text-white transition-all hover:bg-primary/90 focus:outline-none focus:ring-4 focus:ring-primary/20 active:scale-[0.98] disabled:opacity-50"
          >
            {loading ? "Logging in..." : "Log In"}
          </button>
        </form>
      )}

      {/* ── Email OTP Form ──────────────────────────────────── */}
      {activeTab === "otp" && otpStep === "idle" && (
        <form onSubmit={handleSendOtp} className="space-y-5">
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="otpEmail"
              className="text-sm font-medium text-slate-900 dark:text-white"
            >
              Email Address
            </label>
            <div className="relative">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5">
                <span className="material-symbols-outlined text-slate-400 text-[20px]">
                  mail
                </span>
              </div>
              <input
                id="otpEmail"
                type="email"
                value={otpEmail}
                onChange={(e) => setOtpEmail(e.target.value)}
                required
                placeholder="name@company.com"
                className="block w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 py-3 pl-11 pr-4 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="flex w-full items-center justify-center rounded-lg bg-primary px-4 py-3 text-sm font-bold text-white transition-all hover:bg-primary/90 focus:outline-none focus:ring-4 focus:ring-primary/20 active:scale-[0.98] disabled:opacity-50"
          >
            {loading ? (
              "Sending..."
            ) : (
              <>
                <span className="material-symbols-outlined text-[18px] mr-2">
                  mail
                </span>
                Send OTP
              </>
            )}
          </button>
        </form>
      )}

      {activeTab === "otp" && otpStep === "sent" && (
        <form onSubmit={handleVerifyOtp} className="space-y-5">
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-slate-900 dark:text-white">
              Enter 6-digit code
            </label>
            <p className="text-xs text-slate-400 dark:text-slate-500 mb-1">
              Sent to <span className="font-semibold text-slate-600 dark:text-slate-300">{otpEmail}</span>
            </p>
            <div className="flex gap-2 justify-center" onPaste={handleOtpPaste}>
              {otpCode.map((digit, idx) => (
                <input
                  key={idx}
                  ref={(el) => { otpRefs.current[idx] = el; }}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleOtpChange(idx, e.target.value)}
                  onKeyDown={(e) => handleOtpKeyDown(idx, e)}
                  className="h-12 w-12 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-center text-lg font-bold text-slate-900 dark:text-white focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                />
              ))}
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="flex w-full items-center justify-center rounded-lg bg-primary px-4 py-3 text-sm font-bold text-white transition-all hover:bg-primary/90 focus:outline-none focus:ring-4 focus:ring-primary/20 active:scale-[0.98] disabled:opacity-50"
          >
            {loading ? "Verifying..." : "Verify & Log In"}
          </button>

          <div className="flex items-center justify-between text-xs">
            <button
              type="button"
              onClick={() => {
                setOtpStep("idle");
                setOtpCode(["", "", "", "", "", ""]);
                setError("");
                setSuccess("");
              }}
              className="text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 transition-colors"
            >
              ← Change email
            </button>
            <button
              type="button"
              onClick={handleSendOtp}
              disabled={loading}
              className="text-primary hover:text-primary/80 font-semibold transition-colors disabled:opacity-50"
            >
              Resend OTP
            </button>
          </div>
        </form>
      )}

      {/* ── Error / Success Messages ───────────────────────── */}
      {error && (
        <p className="mt-4 text-sm text-red-600 text-center">{error}</p>
      )}
      {success && (
        <p className="mt-4 text-sm text-emerald-600 text-center">{success}</p>
      )}

      {/* ── Sign-up Link ───────────────────────────────────── */}
      <div className="relative my-8">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-slate-200 dark:border-slate-700"></div>
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-white dark:bg-slate-900 px-2 text-slate-400">
            New here?
          </span>
        </div>
      </div>

      <Link href="/signup">
        <button className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 py-3 text-sm font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-all">
          Create an Account
        </button>
      </Link>
    </div>
  );
}
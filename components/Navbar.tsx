"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import ThemeToggle from "@/components/ThemeToggle";
import { supabase } from "@/lib/supabaseClient";

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const checkSession = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      setIsLoggedIn(!!session);
    };
    checkSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsLoggedIn(!!session);
    });
    return () => subscription.unsubscribe();
  }, []);

  return (
    <header className="sticky top-0 z-50 w-full border-b border-slate-100 dark:border-slate-800 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-20">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2">
            <div className="bg-primary text-white p-2 rounded-xl flex items-center justify-center">
              <span className="material-symbols-outlined text-2xl">layers</span>
            </div>
            <span className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">
              ProjectPulse
            </span>
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden md:flex space-x-10">
            <a
              href="#features"
              className="text-sm font-semibold text-slate-600 dark:text-slate-300 hover:text-primary transition-colors"
            >
              Features
            </a>
            <a
              href="#contact"
              className="text-sm font-semibold text-slate-600 dark:text-slate-300 hover:text-primary transition-colors"
            >
              Contact
            </a>
            {isLoggedIn ? (
              <Link
                href="/dashboard/manager"
                className="text-sm font-semibold text-slate-600 dark:text-slate-300 hover:text-primary transition-colors"
              >
                Dashboard
              </Link>
            ) : (
              <Link
                href="/login"
                className="text-sm font-semibold text-slate-600 dark:text-slate-300 hover:text-primary transition-colors"
              >
                Login
              </Link>
            )}
          </nav>

          {/* CTA + Theme Toggle */}
          <div className="hidden md:flex items-center gap-3">
            <ThemeToggle />
            {isLoggedIn ? (
              <Link
                href="/dashboard/manager"
                className="bg-primary hover:bg-primary/90 text-white px-6 py-3 rounded-xl text-sm font-bold transition-all shadow-md shadow-primary/20"
              >
                Go to Dashboard
              </Link>
            ) : (
              <Link
                href="/signup"
                className="bg-primary hover:bg-primary/90 text-white px-6 py-3 rounded-xl text-sm font-bold transition-all shadow-md shadow-primary/20"
              >
                Get Started
              </Link>
            )}
          </div>

          {/* Mobile hamburger */}
          <div className="flex items-center gap-2 md:hidden">
            <ThemeToggle />
            <button
              className="text-slate-700 dark:text-slate-300"
              onClick={() => setIsOpen(!isOpen)}
            >
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                {isOpen ? (
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                ) : (
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 6h16M4 12h16M4 18h16"
                  />
                )}
              </svg>
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        {isOpen && (
          <div className="md:hidden pb-4 space-y-3">
            <a
              href="#features"
              className="block text-sm font-semibold text-slate-600 dark:text-slate-300 hover:text-primary"
            >
              Features
            </a>
            <a
              href="#contact"
              className="block text-sm font-semibold text-slate-600 dark:text-slate-300 hover:text-primary"
            >
              Contact
            </a>
            {isLoggedIn ? (
              <Link
                href="/dashboard/manager"
                className="block text-sm font-semibold text-slate-600 dark:text-slate-300 hover:text-primary"
              >
                Dashboard
              </Link>
            ) : (
              <>
                <Link
                  href="/login"
                  className="block text-sm font-semibold text-slate-600 dark:text-slate-300 hover:text-primary"
                >
                  Login
                </Link>
                <Link
                  href="/signup"
                  className="inline-block bg-primary text-white px-6 py-3 rounded-xl text-sm font-bold"
                >
                  Get Started
                </Link>
              </>
            )}
          </div>
        )}
      </div>
    </header>
  );
}

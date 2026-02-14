"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import DashboardTable from "@/components/DashboardTable";
import ThemeToggle from "@/components/ThemeToggle";
import type { Contact } from "@/types/contact";

export default function DashboardPage() {
  const router = useRouter();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAuthAndFetch = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        router.push("/login");
        return;
      }

      const { data, error } = await supabase
        .from("contacts")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) {
        console.error(error);
      } else {
        setContacts(data || []);
      }
      setLoading(false);
    };

    checkAuthAndFetch();
  }, [router]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  return (
    <div className="flex h-screen overflow-hidden bg-[#f6f6f8] dark:bg-[#101122]">
      {/* Sidebar */}
      <aside className="w-64 flex-shrink-0 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex flex-col justify-between hidden md:flex">
        <div className="flex flex-col overflow-y-auto">
          {/* Brand */}
          <div className="px-6 py-8 flex items-center gap-3">
            <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center text-white">
              <span className="material-symbols-outlined text-2xl">layers</span>
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
                ProjectPulse
              </h1>
              <p className="text-[10px] uppercase tracking-widest text-slate-400 font-bold">
                Admin Console
              </p>
            </div>
          </div>

          {/* Nav */}
          <nav className="flex-1 px-3 space-y-1">
            <a
              href="#"
              className="flex items-center gap-3 px-3 py-2.5 text-sm font-semibold rounded-lg bg-primary/10 text-primary border-r-[3px] border-primary"
            >
              <span className="material-symbols-outlined">inbox</span>
              Demo Requests
            </a>
          </nav>
        </div>

        {/* Logout */}
        <div className="p-4 border-t border-slate-200">
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 w-full p-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors text-sm text-slate-600 dark:text-slate-400"
          >
            <span className="material-symbols-outlined text-lg">logout</span>
            Logout
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Header */}
        <header className="h-16 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between px-8 flex-shrink-0">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">Demo Requests</h2>
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <button
              onClick={handleLogout}
              className="md:hidden text-sm text-slate-600 dark:text-slate-400 hover:text-red-600 transition"
            >
              Logout
            </button>
          </div>
        </header>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-8">
          <div className="max-w-6xl mx-auto space-y-6">
            <div>
              <h2 className="text-3xl font-black tracking-tight text-slate-900 dark:text-white">
                Demo Requests
              </h2>
              <p className="text-slate-500 dark:text-slate-400 mt-1">
                Manage and evaluate potential client inquiries and platform
                walkthroughs.
              </p>
            </div>

            {loading ? (
              <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm p-12 text-center">
                <p className="text-slate-500 dark:text-slate-400">Loading...</p>
              </div>
            ) : (
              <DashboardTable contacts={contacts} />
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

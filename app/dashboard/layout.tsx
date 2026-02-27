"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter, usePathname } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import {
  WorkspaceProvider,
  type WorkspaceContextValue,
  type WorkspaceInfo,
} from "@/context/WorkspaceContext";
import Sidebar from "./components/Sidebar";
import Header from "./components/Header";

const STORAGE_KEY = "projectpulse_active_workspace";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [workspace, setWorkspace] = useState<WorkspaceContextValue | null>(
    null
  );

  const buildContext = useCallback(
    async (
      session: { user: { id: string; email?: string; user_metadata?: Record<string, string> } },
      allWorkspaces: WorkspaceInfo[],
      activeWsId: string
    ) => {
      const activeWs = allWorkspaces.find((w) => w.id === activeWsId)!;
      const role = activeWs.role;

      /* Route guards */
      if (role !== "manager" && pathname.startsWith("/dashboard/manager")) {
        router.replace("/dashboard/member");
        return;
      }
      if (role === "manager" && pathname.startsWith("/dashboard/member")) {
        router.replace("/dashboard/manager");
        return;
      }

      setWorkspace({
        workspaceId: activeWsId,
        userId: session.user.id,
        userRole: role,
        userEmail: session.user.email || "",
        userName:
          session.user.user_metadata?.full_name ||
          session.user.email?.split("@")[0] ||
          "User",
        allWorkspaces,
        switchWorkspace: (newWsId: string) => {
          localStorage.setItem(STORAGE_KEY, newWsId);
          window.location.reload();
        },
      });
      setLoading(false);
    },
    [pathname, router]
  );

  useEffect(() => {
    const checkAuth = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        router.push("/login");
        return;
      }

      /* Fetch ALL workspace memberships */
      const { data: memberships } = await supabase
        .from("workspace_members")
        .select("workspace_id, role")
        .eq("user_id", session.user.id);

      if (!memberships || memberships.length === 0) {
        router.replace("/onboarding");
        return;
      }

      /* Fetch workspace names */
      const wsIds = memberships.map((m) => m.workspace_id);
      const { data: workspaceRows } = await supabase
        .from("workspaces")
        .select("id, name")
        .in("id", wsIds);

      const allWorkspaces: WorkspaceInfo[] = memberships.map((m) => ({
        id: m.workspace_id,
        name: workspaceRows?.find((w) => w.id === m.workspace_id)?.name || "Workspace",
        role: m.role as "manager" | "member",
      }));

      /* Determine active workspace */
      const savedWsId = localStorage.getItem(STORAGE_KEY);
      const activeWsId =
        allWorkspaces.find((w) => w.id === savedWsId)?.id || allWorkspaces[0].id;

      localStorage.setItem(STORAGE_KEY, activeWsId);

      await buildContext(session, allWorkspaces, activeWsId);
    };

    checkAuth();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_OUT" || !session) {
        router.push("/login");
      }
    });

    return () => subscription.unsubscribe();
  }, [router, pathname, buildContext]);

  if (loading || !workspace) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#f6f6f8] dark:bg-[#101122]">
        <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
          <div className="animate-spin h-4 w-4 border-2 border-primary border-t-transparent rounded-full"></div>
          Loading...
        </div>
      </div>
    );
  }

  return (
    <WorkspaceProvider value={workspace}>
      <div className="flex min-h-screen bg-[#f6f6f8] dark:bg-[#101122]">
        {/* Mobile sidebar backdrop */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 bg-black/40 z-40 md:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

        <div className="flex-1 flex flex-col md:ml-64 min-w-0">
          <Header onMenuToggle={() => setSidebarOpen((v) => !v)} />

          <main className="flex-1 p-4 md:p-6 lg:p-8">
            <div className="max-w-7xl mx-auto w-full">{children}</div>
          </main>
        </div>
      </div>
    </WorkspaceProvider>
  );
}

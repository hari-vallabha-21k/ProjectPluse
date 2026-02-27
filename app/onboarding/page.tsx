"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import Modal from "@/components/ui/Modal";

export default function OnboardingPage() {
  const router = useRouter();

  const [checking, setChecking] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);

  /* Modal state */
  const [showCreate, setShowCreate] = useState(false);
  const [showJoin, setShowJoin] = useState(false);

  /* Create workspace */
  const [wsName, setWsName] = useState("");
  const [creating, setCreating] = useState(false);

  /* Join workspace */
  const [joining, setJoining] = useState(false);
  const [joinError, setJoinError] = useState("");
  const [joinSuccess, setJoinSuccess] = useState("");

  /* ------------------------------------------------------------------ */
  /*  On mount: check if user already belongs to a workspace             */
  /* ------------------------------------------------------------------ */
  useEffect(() => {
    const check = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        router.push("/login");
        return;
      }

      setUserId(session.user.id);
      setUserEmail(session.user.email ?? null);

      /* Already a workspace member? Redirect by role */
      const { data: membership } = await supabase
        .from("workspace_members")
        .select("role")
        .eq("user_id", session.user.id)
        .limit(1)
        .maybeSingle();

      if (membership) {
        router.replace(
          membership.role === "manager"
            ? "/dashboard/manager"
            : "/dashboard/member"
        );
        return;
      }

      setChecking(false);
    };

    check();
  }, [router]);

  /* ------------------------------------------------------------------ */
  /*  Create Workspace                                                   */
  /* ------------------------------------------------------------------ */
  const handleCreateWorkspace = async () => {
    if (!wsName.trim() || !userId) return;
    setCreating(true);

    /* 1. Insert workspace */
    const { data: ws, error: wsErr } = await supabase
      .from("workspaces")
      .insert({ name: wsName.trim(), created_by: userId })
      .select("id")
      .single();

    if (wsErr || !ws) {
      alert(wsErr?.message ?? "Failed to create workspace");
      setCreating(false);
      return;
    }

    /* 2. Insert membership as manager */
    const { error: memErr } = await supabase
      .from("workspace_members")
      .insert({ workspace_id: ws.id, user_id: userId, role: "manager", email: userEmail });

    if (memErr) {
      alert(memErr.message);
      setCreating(false);
      return;
    }

    router.replace("/dashboard/manager");
  };

  /* ------------------------------------------------------------------ */
  /*  Join Workspace via invite                                          */
  /* ------------------------------------------------------------------ */
  const handleJoinWorkspace = async () => {
    if (!userId || !userEmail) return;
    setJoining(true);
    setJoinError("");
    setJoinSuccess("");

    /* 1. Find pending invite */
    const { data: invite, error: invErr } = await supabase
      .from("invites")
      .select("id, workspace_id, role")
      .eq("email", userEmail)
      .eq("status", "pending")
      .limit(1)
      .maybeSingle();

    if (invErr) {
      setJoinError(invErr.message);
      setJoining(false);
      return;
    }

    if (!invite) {
      setJoinError("No pending invite found for your email address.");
      setJoining(false);
      return;
    }

    /* 2. Insert into workspace_members */
    const { error: memErr } = await supabase
      .from("workspace_members")
      .insert({
        workspace_id: invite.workspace_id,
        user_id: userId,
        role: invite.role,
        email: userEmail,
      });

    if (memErr) {
      setJoinError(memErr.message);
      setJoining(false);
      return;
    }

    /* 3. Mark invite as accepted */
    await supabase
      .from("invites")
      .update({ status: "accepted" })
      .eq("id", invite.id);

    setJoinSuccess("Invite accepted! Redirecting...");
    setTimeout(() => {
      router.replace(
        invite.role === "manager"
          ? "/dashboard/manager"
          : "/dashboard/member"
      );
    }, 1200);
  };

  /* ------------------------------------------------------------------ */
  /*  Loading state                                                      */
  /* ------------------------------------------------------------------ */
  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f6f6f8] dark:bg-[#101122]">
        <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
          <div className="animate-spin h-4 w-4 border-2 border-primary border-t-transparent rounded-full" />
          Checking workspace…
        </div>
      </div>
    );
  }

  /* ------------------------------------------------------------------ */
  /*  Render                                                             */
  /* ------------------------------------------------------------------ */
  return (
    <>
      <div className="min-h-screen flex items-center justify-center bg-[#f6f6f8] dark:bg-[#101122] p-4">
        <div className="w-full max-w-lg space-y-8">
          {/* Brand */}
          <div className="text-center">
            <div className="inline-flex items-center gap-2 mb-4">
              <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center text-white">
                <span className="material-symbols-outlined text-2xl">bolt</span>
              </div>
              <span className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                ProjectPulse
              </span>
            </div>
            <h1 className="text-3xl font-black tracking-tight text-slate-900 dark:text-white">
              Get Started
            </h1>
            <p className="text-slate-500 dark:text-slate-400 mt-2">
              Create a new workspace or join an existing one.
            </p>
          </div>

          {/* Option cards */}
          <div className="grid gap-4 sm:grid-cols-2">
            {/* Create */}
            <button
              onClick={() => setShowCreate(true)}
              className="flex flex-col items-center gap-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-8 text-center shadow-sm hover:shadow-md hover:border-primary/40 transition-all group"
            >
              <div className="w-16 h-16 rounded-2xl bg-primary/10 text-primary flex items-center justify-center group-hover:scale-110 transition-transform">
                <span className="material-symbols-outlined text-3xl">
                  add_business
                </span>
              </div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                Create Workspace
              </h3>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Start a new workspace and invite your team
              </p>
            </button>

            {/* Join */}
            <button
              onClick={() => {
                setShowJoin(true);
                setJoinError("");
                setJoinSuccess("");
              }}
              className="flex flex-col items-center gap-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-8 text-center shadow-sm hover:shadow-md hover:border-primary/40 transition-all group"
            >
              <div className="w-16 h-16 rounded-2xl bg-emerald-100 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                <span className="material-symbols-outlined text-3xl">
                  group_add
                </span>
              </div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                Join Workspace
              </h3>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Accept a pending invite from your manager
              </p>
            </button>
          </div>
        </div>
      </div>

      {/* ---- Create Workspace Modal ---- */}
      <Modal
        open={showCreate}
        onClose={() => setShowCreate(false)}
        title="Create Workspace"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Workspace Name *
            </label>
            <input
              autoFocus
              value={wsName}
              onChange={(e) => setWsName(e.target.value)}
              placeholder="e.g. Acme Corp"
              className="w-full px-3 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none text-sm"
              onKeyDown={(e) => e.key === "Enter" && handleCreateWorkspace()}
            />
          </div>
          <p className="text-xs text-slate-400 dark:text-slate-500">
            You will be added as the <strong>Manager</strong> of this workspace.
          </p>
          <div className="flex justify-end gap-3 pt-2">
            <button
              onClick={() => setShowCreate(false)}
              className="px-4 py-2 rounded-lg text-sm font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleCreateWorkspace}
              disabled={!wsName.trim() || creating}
              className="px-5 py-2 rounded-lg text-sm font-semibold bg-primary text-white hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {creating ? "Creating…" : "Create Workspace"}
            </button>
          </div>
        </div>
      </Modal>

      {/* ---- Join Workspace Modal ---- */}
      <Modal
        open={showJoin}
        onClose={() => setShowJoin(false)}
        title="Join Workspace"
      >
        <div className="space-y-4">
          <p className="text-sm text-slate-600 dark:text-slate-400">
            We&apos;ll look for a pending invite sent to{" "}
            <strong className="text-slate-900 dark:text-white">
              {userEmail}
            </strong>
            .
          </p>

          {joinError && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3 text-sm text-red-600 dark:text-red-400">
              {joinError}
            </div>
          )}

          {joinSuccess && (
            <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-lg p-3 text-sm text-emerald-600 dark:text-emerald-400">
              {joinSuccess}
            </div>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <button
              onClick={() => setShowJoin(false)}
              className="px-4 py-2 rounded-lg text-sm font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleJoinWorkspace}
              disabled={joining || !!joinSuccess}
              className="px-5 py-2 rounded-lg text-sm font-semibold bg-primary text-white hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {joining ? "Checking…" : "Check for Invite"}
            </button>
          </div>
        </div>
      </Modal>
    </>
  );
}

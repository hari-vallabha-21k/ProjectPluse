"use client";

import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabaseClient";
import Modal from "@/components/ui/Modal";

interface Member {
  user_id: string;
  role: string;
  joined_at: string;
  email: string;
}

interface Invite {
  id: string;
  email: string;
  role: string;
  status: string;
  created_at: string;
}

export default function ManagerTeam() {
  const [members, setMembers] = useState<Member[]>([]);
  const [invites, setInvites] = useState<Invite[]>([]);
  const [workspaceId, setWorkspaceId] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  /* Invite modal */
  const [showInvite, setShowInvite] = useState(false);
  const [invEmail, setInvEmail] = useState("");
  const [invRole, setInvRole] = useState<"member" | "manager">("member");
  const [sending, setSending] = useState(false);
  const [sendResult, setSendResult] = useState<{ ok: boolean; msg: string } | null>(null);
  const [removing, setRemoving] = useState<string | null>(null);

  /* ------------------------------------------------------------------ */
  /*  Fetch workspace, members, invites                                  */
  /* ------------------------------------------------------------------ */
  const fetchData = useCallback(async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session) return;

    setUserId(session.user.id);

    /* Get user workspace */
    const { data: mem } = await supabase
      .from("workspace_members")
      .select("workspace_id")
      .eq("user_id", session.user.id)
      .limit(1)
      .maybeSingle();

    if (!mem) return;
    setWorkspaceId(mem.workspace_id);

    /* Get all members of this workspace */
    const { data: allMembers } = await supabase
      .from("workspace_members")
      .select("user_id, role, joined_at, email")
      .eq("workspace_id", mem.workspace_id);

    if (allMembers) {
      const memberList: Member[] = allMembers.map((m) => ({
        user_id: m.user_id,
        role: m.role,
        joined_at: m.joined_at,
        email: m.email ?? "",
      }));
      setMembers(memberList);
    }

    /* Get invites for this workspace */
    const { data: allInvites } = await supabase
      .from("invites")
      .select("id, email, role, status, created_at")
      .eq("workspace_id", mem.workspace_id)
      .order("created_at", { ascending: false });

    if (allInvites) setInvites(allInvites);

    setLoading(false);
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  /* ------------------------------------------------------------------ */
  /*  Send invite                                                        */
  /* ------------------------------------------------------------------ */
  const handleInvite = async () => {
    if (!invEmail.trim() || !workspaceId || !userId) return;
    setSending(true);
    setSendResult(null);

    /* Check if already invited */
    const { data: existing } = await supabase
      .from("invites")
      .select("id")
      .eq("workspace_id", workspaceId)
      .eq("email", invEmail.trim().toLowerCase())
      .maybeSingle();

    if (existing) {
      setSendResult({ ok: false, msg: "This email has already been invited." });
      setSending(false);
      return;
    }

    /* Insert invite row */
    const { error } = await supabase.from("invites").insert({
      workspace_id: workspaceId,
      email: invEmail.trim().toLowerCase(),
      role: invRole,
      invited_by: userId,
    });

    if (error) {
      setSendResult({ ok: false, msg: error.message });
      setSending(false);
      return;
    }

    /* Send email via our API route */
    let emailSent = false;
    let emailError = "";
    try {
      const res = await fetch("/api/send-invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: invEmail.trim().toLowerCase() }),
      });
      const body = await res.json().catch(() => ({}));
      if (res.ok) {
        emailSent = true;
      } else {
        emailError = body?.error || "Unknown error";
        console.warn("Email send failed:", body);
      }
    } catch (err) {
      emailError = "Email service unavailable";
      console.warn("Email API not available:", err);
    }

    if (emailSent) {
      setSendResult({ ok: true, msg: "Invite saved and email sent!" });
    } else {
      setSendResult({
        ok: true,
        msg: `Invite saved! Email delivery failed: ${emailError}. To fix this, verify a custom domain in your Resend dashboard (resend.com). The invitee can still join by signing up and entering the workspace code on the onboarding page.`,
      });
    }
    setSending(false);
    setInvEmail("");
    setInvRole("member");
    fetchData(); // refresh list
  };

  /* ------------------------------------------------------------------ */
  /*  Helpers                                                            */
  /* ------------------------------------------------------------------ */
  /* ------------------------------------------------------------------ */
  /*  Revoke / delete invite                                             */
  /* ------------------------------------------------------------------ */
  const [revokingInvite, setRevokingInvite] = useState<string | null>(null);

  const handleRevokeInvite = async (inviteId: string) => {
    const confirmed = window.confirm("Are you sure you want to revoke this invitation?");
    if (!confirmed) return;

    setRevokingInvite(inviteId);
    const { error } = await supabase.from("invites").delete().eq("id", inviteId);
    if (error) {
      console.error("Failed to revoke invite:", error);
      alert("Failed to revoke invite: " + error.message);
    } else {
      setInvites((prev) => prev.filter((i) => i.id !== inviteId));
    }
    setRevokingInvite(null);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending":
        return "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-400";
      case "accepted":
        return "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400";
      case "declined":
        return "bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400";
      default:
        return "bg-gray-100 text-gray-700";
    }
  };

  /* ------------------------------------------------------------------ */
  /*  Remove member                                                      */
  /* ------------------------------------------------------------------ */
  const handleRemoveMember = async (memberUserId: string) => {
    if (!workspaceId) return;
    const confirmed = window.confirm("Are you sure you want to remove this member from the workspace?");
    if (!confirmed) return;

    setRemoving(memberUserId);
    const { error } = await supabase
      .from("workspace_members")
      .delete()
      .eq("workspace_id", workspaceId)
      .eq("user_id", memberUserId);

    if (error) {
      console.error("Failed to remove member:", error);
      alert("Failed to remove member: " + error.message);
    } else {
      setMembers((prev) => prev.filter((m) => m.user_id !== memberUserId));
    }
    setRemoving(null);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
          <div className="animate-spin h-4 w-4 border-2 border-primary border-t-transparent rounded-full" />
          Loading team...
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 dark:text-white">
              Team Management
            </h1>
            <p className="text-slate-500 dark:text-slate-400 mt-1">
              Manage your team members and send invites
            </p>
          </div>
          <button
            onClick={() => {
              setShowInvite(true);
              setSendResult(null);
            }}
            className="self-start sm:self-auto bg-primary text-white px-4 py-2 rounded-lg hover:bg-primary/90 transition-colors flex items-center gap-2 text-sm font-semibold"
          >
            <span className="material-symbols-outlined text-lg">person_add</span>
            Invite Member
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4 sm:p-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                <span className="material-symbols-outlined text-primary">group</span>
              </div>
              <div>
                <p className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">{members.length}</p>
                <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">Members</p>
              </div>
            </div>
          </div>
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4 sm:p-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-yellow-500/10 rounded-lg flex items-center justify-center">
                <span className="material-symbols-outlined text-yellow-500">mail</span>
              </div>
              <div>
                <p className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">
                  {invites.filter((i) => i.status === "pending").length}
                </p>
                <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">Pending Invites</p>
              </div>
            </div>
          </div>
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4 sm:p-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-emerald-500/10 rounded-lg flex items-center justify-center">
                <span className="material-symbols-outlined text-emerald-500">check_circle</span>
              </div>
              <div>
                <p className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">
                  {invites.filter((i) => i.status === "accepted").length}
                </p>
                <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">Accepted</p>
              </div>
            </div>
          </div>
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4 sm:p-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-500/10 rounded-lg flex items-center justify-center">
                <span className="material-symbols-outlined text-blue-500">shield_person</span>
              </div>
              <div>
                <p className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">
                  {members.filter((m) => m.role === "manager").length}
                </p>
                <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">Managers</p>
              </div>
            </div>
          </div>
        </div>

        {/* Members List */}
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
          <div className="p-4 sm:p-6 border-b border-slate-200 dark:border-slate-800">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
              Workspace Members ({members.length})
            </h3>
          </div>
          {members.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center px-4">
              <span className="material-symbols-outlined text-5xl text-slate-300 dark:text-slate-600 mb-3">group_off</span>
              <p className="text-lg font-semibold text-slate-500 dark:text-slate-400">No members yet</p>
              <p className="text-sm text-slate-400 dark:text-slate-500 mt-1">Invite someone to get started.</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-200 dark:divide-slate-800">
              {members.map((m) => (
                <div key={m.user_id} className="p-4 sm:p-6 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center text-primary font-semibold text-sm shrink-0">
                        {m.email ? m.email[0].toUpperCase() : m.user_id.slice(0, 2).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">
                          {m.email || m.user_id.slice(0, 8)}
                        </p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          Joined {new Date(m.joined_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                        m.role === "manager"
                          ? "bg-primary/10 text-primary"
                          : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300"
                      }`}>
                        {m.role}
                      </span>
                      {m.user_id !== userId && (
                        <button
                          onClick={() => handleRemoveMember(m.user_id)}
                          disabled={removing === m.user_id}
                          className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-slate-400 hover:text-red-500 dark:hover:text-red-400 transition-colors disabled:opacity-50"
                          title="Remove member"
                        >
                          {removing === m.user_id ? (
                            <div className="animate-spin h-4 w-4 border-2 border-red-500 border-t-transparent rounded-full" />
                          ) : (
                            <span className="material-symbols-outlined text-lg">person_remove</span>
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Invites List */}
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
          <div className="p-4 sm:p-6 border-b border-slate-200 dark:border-slate-800">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
              Invitations ({invites.length})
            </h3>
          </div>
          {invites.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center px-4">
              <span className="material-symbols-outlined text-4xl text-slate-300 dark:text-slate-600 mb-3">forward_to_inbox</span>
              <p className="text-sm font-medium text-slate-500 dark:text-slate-400">No invitations sent yet</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-200 dark:divide-slate-800">
              {invites.map((inv) => (
                <div key={inv.id} className="p-4 sm:p-6 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center text-slate-500 dark:text-slate-400 shrink-0">
                        <span className="material-symbols-outlined text-lg">mail</span>
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">{inv.email}</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          Invited as {inv.role} &middot; {new Date(inv.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0 self-start sm:self-auto">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${getStatusColor(inv.status)}`}>
                        {inv.status}
                      </span>
                      <button
                        onClick={() => handleRevokeInvite(inv.id)}
                        disabled={revokingInvite === inv.id}
                        className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-slate-400 hover:text-red-500 dark:hover:text-red-400 transition-colors disabled:opacity-50"
                        title={inv.status === "pending" ? "Revoke invite" : "Delete invite"}
                      >
                        {revokingInvite === inv.id ? (
                          <div className="animate-spin h-4 w-4 border-2 border-red-500 border-t-transparent rounded-full" />
                        ) : (
                          <span className="material-symbols-outlined text-lg">
                            {inv.status === "pending" ? "cancel" : "delete"}
                          </span>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Invite Modal */}
      <Modal open={showInvite} onClose={() => setShowInvite(false)} title="Invite Team Member">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Email Address *</label>
            <input
              autoFocus
              type="email"
              value={invEmail}
              onChange={(e) => setInvEmail(e.target.value)}
              placeholder="teammate@company.com"
              className="w-full px-3 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none text-sm"
              onKeyDown={(e) => e.key === "Enter" && handleInvite()}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Role</label>
            <select
              value={invRole}
              onChange={(e) => setInvRole(e.target.value as "member" | "manager")}
              className="w-full px-3 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none text-sm"
            >
              <option value="member">Member</option>
              <option value="manager">Manager</option>
            </select>
          </div>

          {sendResult && (
            <div className={`rounded-lg p-3 text-sm border ${
              sendResult.ok
                ? "bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800 text-emerald-600 dark:text-emerald-400"
                : "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-red-600 dark:text-red-400"
            }`}>
              {sendResult.msg}
            </div>
          )}

          <p className="text-xs text-slate-400 dark:text-slate-500">
            An invitation email will be sent. The invitee can sign up and join your workspace from the onboarding page.
          </p>

          <div className="flex justify-end gap-3 pt-2">
            <button
              onClick={() => setShowInvite(false)}
              className="px-4 py-2 rounded-lg text-sm font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleInvite}
              disabled={!invEmail.trim() || sending}
              className="px-5 py-2 rounded-lg text-sm font-semibold bg-primary text-white hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {sending ? (
                <>
                  <div className="animate-spin h-3.5 w-3.5 border-2 border-white border-t-transparent rounded-full" />
                  Sending...
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined text-base">send</span>
                  Send Invite
                </>
              )}
            </button>
          </div>
        </div>
      </Modal>
    </>
  );
}

"use client";

import { useState, useEffect, useCallback } from "react";
import { useWorkspace } from "@/context/WorkspaceContext";
import { supabase } from "@/lib/supabaseClient";
import NotificationBell from "./NotificationBell";
import ThemeToggle from "@/components/ThemeToggle";
import Modal from "@/components/ui/Modal";

interface TeamMember {
  user_id: string;
  email: string;
  role: string;
}

interface HeaderProps {
  onMenuToggle?: () => void;
}

export default function Header({ onMenuToggle }: HeaderProps) {
  const { userRole, workspaceId, userId } = useWorkspace();

  /* Workspace members for team picker */
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);

  const fetchMembers = useCallback(async () => {
    if (!workspaceId) return;
    const { data } = await supabase
      .from("workspace_members")
      .select("user_id, email, role")
      .eq("workspace_id", workspaceId);
    if (data) setTeamMembers(data);
  }, [workspaceId]);

  useEffect(() => {
    fetchMembers();
  }, [fetchMembers]);

  /* Create-project modal state */
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [priority, setPriority] = useState<"high" | "medium" | "low">("medium");
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  const [creating, setCreating] = useState(false);

  const resetForm = () => {
    setName("");
    setDescription("");
    setDueDate("");
    setPriority("medium");
    setSelectedMembers([]);
  };

  const toggleMember = (uid: string) => {
    setSelectedMembers((prev) =>
      prev.includes(uid) ? prev.filter((id) => id !== uid) : [...prev, uid]
    );
  };

  const handleCreate = async () => {
    if (!name.trim() || creating) return;
    setCreating(true);

    /* 1. Create the project */
    const { data: project, error } = await supabase
      .from("projects")
      .insert({
        workspace_id: workspaceId,
        name: name.trim(),
        description: description.trim(),
        status: "active",
        priority,
        due_date: dueDate || "TBD",
        created_by: userId,
      })
      .select()
      .single();

    if (error || !project) {
      setCreating(false);
      alert(error?.message || "Failed to create project");
      return;
    }

    /* 2. Always add the creator (manager) as project lead */
    const memberRows = [
      { project_id: project.id, user_id: userId, role: "lead" },
      ...selectedMembers
        .filter((uid) => uid !== userId)
        .map((uid) => ({ project_id: project.id, user_id: uid, role: "member" })),
    ];

    if (memberRows.length > 0) {
      await supabase.from("project_members").insert(memberRows);
    }

    /* 3. Notify assigned members */
    const notifRows = selectedMembers
      .filter((uid) => uid !== userId)
      .map((uid) => ({
        workspace_id: workspaceId,
        user_id: uid,
        type: "general",
        title: "Added to project",
        message: `You have been added to project "${project.name}"`,
      }));

    if (notifRows.length > 0) {
      await supabase.from("notifications").insert(notifRows);
    }

    setCreating(false);
    resetForm();
    setShowCreate(false);
  };

  return (
    <>
      <header className="sticky top-0 z-30 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 px-4 md:px-8 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          {/* Mobile hamburger */}
          <button
            onClick={onMenuToggle}
            className="md:hidden p-2 -ml-2 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg"
            aria-label="Toggle sidebar"
          >
            <span className="material-symbols-outlined">menu</span>
          </button>

          {/* Search */}
          <div className="relative flex-1 max-w-md">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xl">
              search
            </span>
            <input
              className="w-full pl-10 pr-4 py-2 bg-slate-100 dark:bg-slate-800 border-transparent focus:border-primary focus:ring-0 rounded-lg text-sm placeholder:text-slate-400"
              placeholder="Search projects, tasks..."
              type="text"
            />
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 md:gap-4">
            <ThemeToggle />
            <NotificationBell />
            {userRole === "manager" && (
              <button
                onClick={() => setShowCreate(true)}
                className="bg-primary hover:bg-primary/90 text-white px-3 md:px-4 py-2 rounded-lg text-sm font-semibold flex items-center gap-2 transition-all shadow-sm"
              >
                <span className="material-symbols-outlined text-lg">add</span>
                <span className="hidden sm:inline">New Project</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Create Project Modal */}
      <Modal
        open={showCreate}
        onClose={() => {
          setShowCreate(false);
          resetForm();
        }}
        title="Create New Project"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Project Name *
            </label>
            <input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Website Redesign"
              className="w-full px-3 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none text-sm"
              onKeyDown={(e) => e.key === "Enter" && handleCreate()}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief project description..."
              rows={3}
              className="w-full px-3 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none text-sm resize-none"
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Due Date
              </label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full px-3 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Priority
              </label>
              <select
                value={priority}
                onChange={(e) =>
                  setPriority(e.target.value as "high" | "medium" | "low")
                }
                className="w-full px-3 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none text-sm"
              >
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
            </div>
          </div>

          {/* Team Members Picker */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Assign Team Members
            </label>
            <div className="border border-slate-200 dark:border-slate-700 rounded-lg max-h-48 overflow-y-auto">
              {teamMembers.filter((m) => m.user_id !== userId).length === 0 ? (
                <p className="p-3 text-sm text-slate-400 text-center">
                  No team members in workspace yet
                </p>
              ) : (
                teamMembers
                  .filter((m) => m.user_id !== userId)
                  .map((member) => {
                    const isSelected = selectedMembers.includes(member.user_id);
                    return (
                      <button
                        key={member.user_id}
                        type="button"
                        onClick={() => toggleMember(member.user_id)}
                        className={`w-full flex items-center gap-3 px-3 py-2.5 text-left hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors border-b border-slate-100 dark:border-slate-800 last:border-b-0 ${
                          isSelected ? "bg-primary/5 dark:bg-primary/10" : ""
                        }`}
                      >
                        <div
                          className={`w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 transition-colors ${
                            isSelected
                              ? "bg-primary border-primary"
                              : "border-slate-300 dark:border-slate-600"
                          }`}
                        >
                          {isSelected && (
                            <span className="material-symbols-outlined text-white text-sm">
                              check
                            </span>
                          )}
                        </div>
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                          <span className="text-xs font-bold text-primary uppercase">
                            {member.email?.charAt(0) || "?"}
                          </span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-slate-900 dark:text-white truncate">
                            {member.email}
                          </p>
                          <p className="text-xs text-slate-500 dark:text-slate-400 capitalize">
                            {member.role}
                          </p>
                        </div>
                      </button>
                    );
                  })
              )}
            </div>
            {selectedMembers.length > 0 && (
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5">
                {selectedMembers.length} member{selectedMembers.length > 1 ? "s" : ""} selected
              </p>
            )}
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              onClick={() => {
                setShowCreate(false);
                resetForm();
              }}
              className="px-4 py-2 rounded-lg text-sm font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleCreate}
              disabled={!name.trim() || creating}
              className="px-5 py-2 rounded-lg text-sm font-semibold bg-primary text-white hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {creating ? "Creating..." : "Create Project"}
            </button>
          </div>
        </div>
      </Modal>
    </>
  );
}

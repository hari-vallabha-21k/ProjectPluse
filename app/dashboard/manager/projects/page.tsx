"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useWorkspace } from "@/context/WorkspaceContext";
import { logActivity } from "@/services/activityLog";
import Modal from "@/components/ui/Modal";

interface Project {
  id: string;
  name: string;
  description: string;
  status: string;
  priority: string;
  progress: number;
  due_date: string;
  created_at: string;
  members?: { user_id: string; email: string; role: string }[];
}

interface TeamMember {
  user_id: string;
  email: string;
  role: string;
}

export default function ManagerProjects() {
  const { workspaceId, userId, userEmail } = useWorkspace();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [showCreate, setShowCreate] = useState(false);

  /* Team members */
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);

  /* Form state */
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [priority, setPriority] = useState<"high" | "medium" | "low">("medium");
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);

  const fetchMembers = useCallback(async () => {
    if (!workspaceId) return;
    const { data } = await supabase
      .from("workspace_members")
      .select("user_id, email, role")
      .eq("workspace_id", workspaceId);
    if (data) setTeamMembers(data);
  }, [workspaceId]);

  const fetchProjects = useCallback(async () => {
    /* Fetch projects */
    const { data: projectsData } = await supabase
      .from("projects")
      .select("*")
      .eq("workspace_id", workspaceId)
      .order("created_at", { ascending: false });

    if (!projectsData) {
      setLoading(false);
      return;
    }

    /* Fetch all project_members for these projects */
    const projectIds = projectsData.map((p) => p.id);
    const { data: pmData } = await supabase
      .from("project_members")
      .select("project_id, user_id, role")
      .in("project_id", projectIds.length > 0 ? projectIds : ["_"]);

    /* Fetch workspace members to map user_id -> email */
    const { data: wsMembers } = await supabase
      .from("workspace_members")
      .select("user_id, email, role")
      .eq("workspace_id", workspaceId);

    const emailMap: Record<string, string> = {};
    const roleMap: Record<string, string> = {};
    (wsMembers || []).forEach((m) => {
      emailMap[m.user_id] = m.email || "";
      roleMap[m.user_id] = m.role;
    });

    /* Attach members to each project */
    const enriched: Project[] = projectsData.map((p) => ({
      ...p,
      members: (pmData || [])
        .filter((pm) => pm.project_id === p.id)
        .map((pm) => ({
          user_id: pm.user_id,
          email: emailMap[pm.user_id] || "",
          role: pm.role,
        })),
    }));

    setProjects(enriched);
    setLoading(false);
  }, [workspaceId]);

  useEffect(() => {
    fetchProjects();
    fetchMembers();
  }, [fetchProjects, fetchMembers]);

  const filteredProjects = projects.filter((p) => {
    if (filter === "all") return true;
    return p.status === filter;
  });

  const toggleMember = (uid: string) => {
    setSelectedMembers((prev) =>
      prev.includes(uid) ? prev.filter((id) => id !== uid) : [...prev, uid]
    );
  };

  const handleCreate = async () => {
    if (!name.trim()) return;

    /* 1. Create the project */
    const { data, error } = await supabase
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

    if (error) {
      alert(error.message);
      return;
    }

    if (data) {
      /* 2. Add project_members: creator as lead + selected members */
      const memberRows = [
        { project_id: data.id, user_id: userId, role: "lead" },
        ...selectedMembers
          .filter((uid) => uid !== userId)
          .map((uid) => ({ project_id: data.id, user_id: uid, role: "member" })),
      ];
      await supabase.from("project_members").insert(memberRows);

      /* Log activity */
      logActivity({
        workspaceId,
        userId,
        userEmail,
        action: "created project",
        entityType: "project",
        entityId: data.id,
        metadata: { name: data.name },
      });

      /* 3. Notify assigned members */
      const notifRows = selectedMembers
        .filter((uid) => uid !== userId)
        .map((uid) => ({
          workspace_id: workspaceId,
          user_id: uid,
          type: "general",
          title: "Added to project",
          message: `You have been added to project "${data.name}"`,
        }));

      if (notifRows.length > 0) {
        await supabase.from("notifications").insert(notifRows);
      }

      /* Build enriched project for local state */
      const emailMap: Record<string, string> = {};
      teamMembers.forEach((m) => { emailMap[m.user_id] = m.email; });

      const enrichedProject: Project = {
        ...data,
        members: memberRows.map((mr) => ({
          user_id: mr.user_id,
          email: emailMap[mr.user_id] || "",
          role: mr.role,
        })),
      };

      setProjects((prev) => [enrichedProject, ...prev]);
    }

    setName("");
    setDescription("");
    setDueDate("");
    setPriority("medium");
    setSelectedMembers([]);
    setShowCreate(false);
  };

  const handleDelete = async (id: string) => {
    const confirmed = window.confirm("Delete this project?");
    if (!confirmed) return;
    const { error } = await supabase.from("projects").delete().eq("id", id);
    if (error) {
      alert(error.message);
      return;
    }
    const deleted = projects.find((p) => p.id === id);
    setProjects((prev) => prev.filter((p) => p.id !== id));

    /* Log activity */
    logActivity({
      workspaceId,
      userId,
      userEmail,
      action: "deleted project",
      entityType: "project",
      entityId: id,
      metadata: { name: deleted?.name || "Unknown" },
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400";
      case "completed":
        return "bg-blue-100 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400";
      case "paused":
        return "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-400";
      default:
        return "bg-gray-100 text-gray-700";
    }
  };

  const getPriorityColor = (p: string) => {
    switch (p) {
      case "high":
        return "text-red-600 dark:text-red-400";
      case "medium":
        return "text-orange-600 dark:text-orange-400";
      case "low":
        return "text-green-600 dark:text-green-400";
      default:
        return "text-gray-600";
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
          <div className="animate-spin h-4 w-4 border-2 border-primary border-t-transparent rounded-full" />
          Loading projects...
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
              Project Management
            </h1>
            <p className="text-slate-500 dark:text-slate-400 mt-1">
              Manage and oversee all team projects
            </p>
          </div>
          <button
            onClick={() => setShowCreate(true)}
            className="self-start sm:self-auto bg-primary text-white px-4 py-2 rounded-lg hover:bg-primary/90 transition-colors flex items-center gap-2 text-sm font-semibold"
          >
            <span className="material-symbols-outlined text-lg">add</span>
            New Project
          </button>
        </div>

        {/* Filters */}
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4 sm:p-6">
          <div className="flex flex-wrap gap-2 sm:gap-3">
            {[
              { key: "all", label: `All (${projects.length})` },
              {
                key: "active",
                label: `Active (${projects.filter((p) => p.status === "active").length})`,
              },
              {
                key: "completed",
                label: `Completed (${projects.filter((p) => p.status === "completed").length})`,
              },
              {
                key: "paused",
                label: `Paused (${projects.filter((p) => p.status === "paused").length})`,
              },
            ].map((f) => (
              <button
                key={f.key}
                onClick={() => setFilter(f.key)}
                className={`px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-medium transition-colors ${filter === f.key
                    ? "bg-primary text-white"
                    : "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
                  }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* Grid */}
        {filteredProjects.length === 0 ? (
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-12 sm:p-16 text-center">
            <span className="material-symbols-outlined text-5xl text-slate-300 dark:text-slate-600 mb-3 block">
              folder_off
            </span>
            <p className="text-lg font-semibold text-slate-500 dark:text-slate-400">
              No projects yet
            </p>
            <p className="text-sm text-slate-400 dark:text-slate-500 mt-1">
              Create your first project to get started.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
            {filteredProjects.map((project) => (
              <div
                key={project.id}
                className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5 sm:p-6 hover:shadow-lg transition-shadow"
              >
                <div className="flex items-start justify-between mb-4 gap-2">
                  <div className="flex-1 min-w-0">
                    <h3 className="text-base sm:text-lg font-semibold text-slate-900 dark:text-white mb-1 truncate">
                      {project.name}
                    </h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400 line-clamp-2">
                      {project.description || "No description"}
                    </p>
                  </div>
                  <span
                    className={`shrink-0 px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(
                      project.status
                    )}`}
                  >
                    {project.status}
                  </span>
                </div>

                <div className="space-y-3">
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-slate-600 dark:text-slate-400">
                        Progress
                      </span>
                      <span className="font-medium text-slate-900 dark:text-white">
                        {project.progress}%
                      </span>
                    </div>
                    <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2">
                      <div
                        className="bg-primary h-2 rounded-full transition-all duration-300"
                        style={{ width: `${project.progress}%` }}
                      />
                    </div>
                  </div>

                  {/* Team Avatars */}
                  {project.members && project.members.length > 0 && (
                    <div className="flex items-center gap-2">
                      <div className="flex -space-x-2">
                        {project.members.slice(0, 4).map((m) => (
                          <div
                            key={m.user_id}
                            title={m.email}
                            className="w-7 h-7 rounded-full bg-primary/10 border-2 border-white dark:border-slate-900 flex items-center justify-center"
                          >
                            <span className="text-[10px] font-bold text-primary uppercase">
                              {m.email?.charAt(0) || "?"}
                            </span>
                          </div>
                        ))}
                        {project.members.length > 4 && (
                          <div className="w-7 h-7 rounded-full bg-slate-200 dark:bg-slate-700 border-2 border-white dark:border-slate-900 flex items-center justify-center">
                            <span className="text-[10px] font-bold text-slate-600 dark:text-slate-400">
                              +{project.members.length - 4}
                            </span>
                          </div>
                        )}
                      </div>
                      <span className="text-xs text-slate-500 dark:text-slate-400">
                        {project.members.length} member{project.members.length !== 1 ? "s" : ""}
                      </span>
                    </div>
                  )}

                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-base text-slate-400">
                        schedule
                      </span>
                      <span className="text-slate-600 dark:text-slate-400">
                        Due: {project.due_date}
                      </span>
                    </div>
                    <div
                      className={`flex items-center gap-1 ${getPriorityColor(
                        project.priority
                      )}`}
                    >
                      <span className="material-symbols-outlined text-base">
                        flag
                      </span>
                      <span className="font-medium text-xs">
                        {project.priority}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex gap-2 mt-4 pt-4 border-t border-slate-200 dark:border-slate-700">
                  <button className="flex-1 bg-primary text-white py-2 px-3 rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors">
                    View Details
                  </button>
                  <button
                    onClick={() => handleDelete(project.id)}
                    className="px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 hover:border-red-200 dark:hover:border-red-800 transition-colors"
                    title="Delete project"
                  >
                    <span className="material-symbols-outlined text-lg text-slate-600 dark:text-slate-400">
                      delete
                    </span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create Project Modal */}
      <Modal
        open={showCreate}
        onClose={() => setShowCreate(false)}
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
                        className={`w-full flex items-center gap-3 px-3 py-2.5 text-left hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors border-b border-slate-100 dark:border-slate-800 last:border-b-0 ${isSelected ? "bg-primary/5 dark:bg-primary/10" : ""
                          }`}
                      >
                        <div
                          className={`w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 transition-colors ${isSelected
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
              onClick={() => setShowCreate(false)}
              className="px-4 py-2 rounded-lg text-sm font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleCreate}
              disabled={!name.trim()}
              className="px-5 py-2 rounded-lg text-sm font-semibold bg-primary text-white hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Create Project
            </button>
          </div>
        </div>
      </Modal>
    </>
  );
}

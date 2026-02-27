"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useWorkspace } from "@/context/WorkspaceContext";
import { logActivity } from "@/services/activityLog";
import Modal from "@/components/ui/Modal";

interface Project {
  id: string;
  name: string;
}

interface Member {
  user_id: string;
  email: string;
  role: string;
}

interface Task {
  id: string;
  title: string;
  description: string;
  status: string;
  priority: string;
  due_date: string;
  assigned_to: string | null;
  project_id: string | null;
  created_at: string;
  project: { name: string } | null;
}

export default function ManagerTasks() {
  const { workspaceId, userId, userEmail } = useWorkspace();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [showCreate, setShowCreate] = useState(false);

  /* Form state */
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [assignedTo, setAssignedTo] = useState("");
  const [projectId, setProjectId] = useState("");
  const [priority, setPriority] = useState<"High" | "Medium" | "Low">("Medium");
  const [status, setStatus] = useState<
    "To Do" | "In Progress" | "In Review" | "Done"
  >("To Do");
  const [dueDate, setDueDate] = useState("");

  /* Member lookup */
  const memberMap = Object.fromEntries(
    members.map((m) => [m.user_id, m])
  );

  const fetchData = useCallback(async () => {
    const [taskRes, projRes, memRes] = await Promise.all([
      supabase
        .from("tasks")
        .select("*, project:projects(name)")
        .eq("workspace_id", workspaceId)
        .order("created_at", { ascending: false }),
      supabase
        .from("projects")
        .select("id, name")
        .eq("workspace_id", workspaceId)
        .order("name"),
      supabase
        .from("workspace_members")
        .select("user_id, email, role")
        .eq("workspace_id", workspaceId),
    ]);
    if (taskRes.data) {
      const normalized = (taskRes.data as unknown[]).map((t: any) => ({
        ...t,
        project: Array.isArray(t.project) ? t.project[0] ?? null : t.project,
      })) as Task[];
      setTasks(normalized);
    }
    if (projRes.data) setProjects(projRes.data);
    if (memRes.data) setMembers(memRes.data);
    setLoading(false);
  }, [workspaceId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const filteredTasks = tasks.filter((t) => {
    if (filter === "all") return true;
    return t.status === filter;
  });

  const handleCreate = async () => {
    if (!title.trim()) return;
    const { data, error } = await supabase
      .from("tasks")
      .insert({
        workspace_id: workspaceId,
        title: title.trim(),
        description: description.trim(),
        assigned_to: assignedTo || null,
        project_id: projectId || null,
        priority,
        status,
        due_date: dueDate || null,
        created_by: userId,
      })
      .select("*, project:projects(name)")
      .single();

    if (error) {
      alert(error.message);
      return;
    }
    if (data) {
      setTasks((prev) => [data as Task, ...prev]);

      /* Log activity */
      const assignee = assignedTo ? (memberMap[assignedTo]?.email || "someone") : null;
      logActivity({
        workspaceId,
        userId,
        userEmail,
        action: assignee ? `created task and assigned to ${assignee.split("@")[0]}` : "created task",
        entityType: "task",
        entityId: data.id,
        metadata: { title: data.title },
      });
    }
    setTitle("");
    setDescription("");
    setAssignedTo("");
    setProjectId("");
    setPriority("Medium");
    setStatus("To Do");
    setDueDate("");
    setShowCreate(false);
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("tasks").delete().eq("id", id);
    if (error) {
      alert(error.message);
      return;
    }
    const deleted = tasks.find((t) => t.id === id);
    setTasks((prev) => prev.filter((t) => t.id !== id));

    /* Log activity */
    logActivity({
      workspaceId,
      userId,
      userEmail,
      action: "deleted task",
      entityType: "task",
      entityId: id,
      metadata: { title: deleted?.title || "Unknown" },
    });
  };

  const getStatusColor = (s: string) => {
    switch (s) {
      case "To Do":
        return "bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-200";
      case "In Progress":
        return "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300";
      case "In Review":
        return "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300";
      case "Done":
        return "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300";
      default:
        return "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300";
    }
  };

  const getPriorityColor = (p: string) => {
    switch (p) {
      case "High":
        return "text-red-600 dark:text-red-300";
      case "Medium":
        return "text-orange-600 dark:text-orange-300";
      case "Low":
        return "text-green-600 dark:text-green-300";
      default:
        return "text-gray-600 dark:text-gray-300";
    }
  };

  const assigneeName = (uid: string | null) => {
    if (!uid) return "Unassigned";
    const m = memberMap[uid];
    return m?.email || uid.slice(0, 8);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
          <div className="animate-spin h-4 w-4 border-2 border-primary border-t-transparent rounded-full" />
          Loading tasks...
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
              Task Management
            </h1>
            <p className="text-slate-500 dark:text-slate-400 mt-1">
              Assign and track tasks across all projects
            </p>
          </div>
          <button
            onClick={() => setShowCreate(true)}
            className="self-start sm:self-auto bg-primary text-white px-4 py-2 rounded-lg hover:bg-primary/90 transition-colors flex items-center gap-2 text-sm font-semibold"
          >
            <span className="material-symbols-outlined text-lg">add</span>
            Create Task
          </button>
        </div>

        {/* Task Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
          {[
            { label: "To Do", icon: "assignment", bgClass: "bg-slate-500/10", textClass: "text-slate-500", key: "To Do" },
            {
              label: "In Progress",
              icon: "pending",
              bgClass: "bg-blue-500/10",
              textClass: "text-blue-500",
              key: "In Progress",
            },
            {
              label: "In Review",
              icon: "rate_review",
              bgClass: "bg-yellow-500/10",
              textClass: "text-yellow-500",
              key: "In Review",
            },
            {
              label: "Done",
              icon: "check_circle",
              bgClass: "bg-emerald-500/10",
              textClass: "text-emerald-500",
              key: "Done",
            },
          ].map((s) => (
            <div
              key={s.key}
              className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4 sm:p-6"
            >
              <div className="flex items-center gap-3">
                <div
                  className={`w-10 h-10 ${s.bgClass} rounded-lg flex items-center justify-center`}
                >
                  <span
                    className={`material-symbols-outlined ${s.textClass}`}
                  >
                    {s.icon}
                  </span>
                </div>
                <div>
                  <p className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">
                    {tasks.filter((t) => t.status === s.key).length}
                  </p>
                  <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
                    {s.label}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4 sm:p-6">
          <div className="flex flex-wrap gap-2 sm:gap-3">
            {["all", "To Do", "In Progress", "In Review", "Done"].map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-medium transition-colors ${filter === f
                  ? "bg-primary text-white"
                  : "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
                  }`}
              >
                {f === "all" ? "All Tasks" : f}
              </button>
            ))}
          </div>
        </div>

        {/* Tasks List */}
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
          <div className="p-4 sm:p-6 border-b border-slate-200 dark:border-slate-800">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
              Tasks ({filteredTasks.length})
            </h3>
          </div>
          {filteredTasks.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center px-4">
              <span className="material-symbols-outlined text-5xl text-slate-300 dark:text-slate-600 mb-3">
                assignment
              </span>
              <p className="text-lg font-semibold text-slate-500 dark:text-slate-400">
                No tasks yet
              </p>
              <p className="text-sm text-slate-400 dark:text-slate-500 mt-1">
                Create a task to get started.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-200 dark:divide-slate-800">
              {filteredTasks.map((task) => (
                <div
                  key={task.id}
                  className="p-4 sm:p-6 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-2">
                        <h4 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white truncate">
                          {task.title}
                        </h4>
                        <span
                          className={`shrink-0 px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(
                            task.status
                          )}`}
                        >
                          {task.status.replace("_", " ")}
                        </span>
                        <span
                          className={`shrink-0 flex items-center gap-1 ${getPriorityColor(
                            task.priority
                          )}`}
                        >
                          <span className="material-symbols-outlined text-sm">
                            flag
                          </span>
                          <span className="text-xs font-medium">
                            {task.priority}
                          </span>
                        </span>
                      </div>
                      {task.description && (
                        <p className="text-sm text-slate-600 dark:text-slate-300 mb-3 line-clamp-2">
                          {task.description}
                        </p>
                      )}
                      <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-sm text-slate-700 dark:text-slate-300">
                        <div className="flex items-center gap-1">
                          <span className="material-symbols-outlined text-sm">
                            person
                          </span>
                          <span>{assigneeName(task.assigned_to)}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <span className="material-symbols-outlined text-sm">
                            folder
                          </span>
                          <span>
                            {task.project?.name || "No project"}
                          </span>
                        </div>
                        <div className="flex items-center gap-1">
                          <span className="material-symbols-outlined text-sm">
                            schedule
                          </span>
                          <span>Due: {task.due_date}</span>
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => handleDelete(task.id)}
                      className="shrink-0 p-2 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                      title="Delete task"
                    >
                      <span className="material-symbols-outlined text-lg text-slate-500 hover:text-red-500 dark:text-slate-400 dark:hover:text-red-400 transition-colors">
                        delete
                      </span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Create Task Modal */}
      <Modal
        open={showCreate}
        onClose={() => setShowCreate(false)}
        title="Create New Task"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Task Title *
            </label>
            <input
              autoFocus
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Implement landing page"
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
              placeholder="Brief task description..."
              rows={2}
              className="w-full px-3 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none text-sm resize-none"
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Assign To
              </label>
              <select
                value={assignedTo}
                onChange={(e) => setAssignedTo(e.target.value)}
                className="w-full px-3 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none text-sm"
              >
                <option value="">Unassigned</option>
                {members.map((m) => (
                  <option key={m.user_id} value={m.user_id}>
                    {m.email || m.user_id.slice(0, 8)}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Project
              </label>
              <select
                value={projectId}
                onChange={(e) => setProjectId(e.target.value)}
                className="w-full px-3 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none text-sm"
              >
                <option value="">No Project</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Priority
              </label>
              <select
                value={priority}
                onChange={(e) =>
                  setPriority(e.target.value as "High" | "Medium" | "Low")
                }
                className="w-full px-3 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none text-sm"
              >
                <option value="High">High</option>
                <option value="Medium">Medium</option>
                <option value="Low">Low</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Status
              </label>
              <select
                value={status}
                onChange={(e) =>
                  setStatus(
                    e.target.value as
                    | "To Do"
                    | "In Progress"
                    | "In Review"
                    | "Done"
                  )
                }
                className="w-full px-3 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none text-sm"
              >
                <option value="To Do">To Do</option>
                <option value="In Progress">In Progress</option>
                <option value="In Review">In Review</option>
                <option value="Done">Done</option>
              </select>
            </div>
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
              disabled={!title.trim()}
              className="px-5 py-2 rounded-lg text-sm font-semibold bg-primary text-white hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Create Task
            </button>
          </div>
        </div>
      </Modal>
    </>
  );
}

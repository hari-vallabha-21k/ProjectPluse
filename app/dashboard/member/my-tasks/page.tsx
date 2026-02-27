"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useWorkspace } from "@/context/WorkspaceContext";

interface Task {
  id: string;
  title: string;
  description: string;
  status: string;
  priority: string;
  due_date: string | null;
  created_at: string;
  project: { id: string; name: string } | null;
}

const STATUSES = ["To Do", "In Progress", "In Review", "Done"];
const FILTERS = ["All", ...STATUSES];

export default function MemberMyTasks() {
  const { userId, workspaceId } = useWorkspace();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("All");

  async function fetchTasks() {
    setLoading(true);
    const { data } = await supabase
      .from("tasks")
      .select("id, title, description, status, priority, due_date, created_at, project:projects(id, name)")
      .eq("workspace_id", workspaceId)
      .eq("assigned_to", userId)
      .order("created_at", { ascending: false });
    const normalized = ((data ?? []) as unknown[]).map((t: any) => ({
      ...t,
      project: Array.isArray(t.project) ? t.project[0] ?? null : t.project,
    })) as Task[];
    setTasks(normalized);
    setLoading(false);
  }

  useEffect(() => { fetchTasks(); }, [workspaceId, userId]);

  async function handleStatusChange(taskId: string, newStatus: string) {
    setTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, status: newStatus } : t))
    );
    await supabase.from("tasks").update({ status: newStatus }).eq("id", taskId);
  }

  const filtered = filter === "All" ? tasks : tasks.filter((t) => t.status === filter);

  const statusColor = (s: string) => {
    const map: Record<string, string> = {
      "To Do": "bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-200",
      "In Progress": "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
      "In Review": "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300",
      Done: "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300",
    };
    return map[s] ?? "bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-200";
  };

  const priorityColor = (p: string) => {
    const map: Record<string, string> = {
      High: "text-red-600 dark:text-red-300",
      Medium: "text-yellow-600 dark:text-yellow-300",
      Low: "text-green-600 dark:text-green-300",
    };
    return map[p] ?? "text-slate-500 dark:text-slate-300";
  };

  const priorityIcon = (p: string) => {
    const map: Record<string, string> = {
      High: "arrow_upward",
      Medium: "drag_handle",
      Low: "arrow_downward",
    };
    return map[p] ?? "drag_handle";
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-slate-900 dark:text-white">
            My Tasks
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">
            {tasks.length} task{tasks.length !== 1 ? "s" : ""} assigned to you
          </p>
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex flex-wrap gap-2">
        {FILTERS.map((f) => {
          const count = f === "All" ? tasks.length : tasks.filter((t) => t.status === f).length;
          return (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors flex items-center gap-2 ${filter === f
                  ? "bg-primary text-white"
                  : "bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-primary/50"
                }`}
            >
              {f}
              <span
                className={`inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 text-xs font-semibold rounded-full ${filter === f
                    ? "bg-white/20 text-white"
                    : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400"
                  }`}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Task cards */}
      {filtered.length === 0 ? (
        <div className="text-center py-16 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
          <span className="material-symbols-outlined text-5xl text-slate-300 dark:text-slate-600">
            task_alt
          </span>
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white mt-4">
            {filter === "All" ? "No tasks assigned yet" : `No "${filter}" tasks`}
          </h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Tasks assigned to you by the manager will appear here.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((task) => {
            const isOverdue =
              task.due_date && task.status !== "Done" && new Date(task.due_date) < new Date();

            return (
              <div
                key={task.id}
                className={`bg-white dark:bg-slate-900 rounded-xl border p-4 sm:p-5 transition-colors ${isOverdue
                    ? "border-red-200 dark:border-red-900/50"
                    : "border-slate-200 dark:border-slate-800"
                  }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                  {/* Left */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-base font-bold text-slate-900 dark:text-white">
                        {task.title}
                      </h3>
                      {isOverdue && (
                        <span className="inline-flex items-center gap-0.5 px-2 py-0.5 text-[10px] font-bold uppercase rounded-full bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">
                          <span className="material-symbols-outlined text-[12px]">warning</span>
                          Overdue
                        </span>
                      )}
                    </div>
                    {task.description && (
                      <p className="text-sm text-slate-600 dark:text-slate-300 mt-1 line-clamp-2">
                        {task.description}
                      </p>
                    )}
                    <div className="flex items-center flex-wrap gap-3 mt-3">
                      {task.project && (
                        <span className="inline-flex items-center gap-1 text-xs text-slate-600 dark:text-slate-300">
                          <span className="material-symbols-outlined text-[14px]">folder</span>
                          {task.project.name}
                        </span>
                      )}
                      <span className={`inline-flex items-center gap-0.5 text-xs font-medium ${priorityColor(task.priority)}`}>
                        <span className="material-symbols-outlined text-[14px]">{priorityIcon(task.priority)}</span>
                        {task.priority}
                      </span>
                      {task.due_date && (
                        <span className={`inline-flex items-center gap-1 text-xs ${isOverdue ? "text-red-600 dark:text-red-400 font-medium" : "text-slate-500 dark:text-slate-400"}`}>
                          <span className="material-symbols-outlined text-[14px]">calendar_today</span>
                          {new Date(task.due_date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Right – status dropdown */}
                  <div className="sm:ml-4 shrink-0">
                    <label className="block text-[10px] uppercase font-semibold text-slate-400 dark:text-slate-500 mb-1">
                      Status
                    </label>
                    <select
                      value={task.status}
                      onChange={(e) => handleStatusChange(task.id, e.target.value)}
                      className={`px-3 py-1.5 rounded-lg text-sm font-medium border-0 outline-none cursor-pointer transition-colors ${statusColor(task.status)}`}
                    >
                      {STATUSES.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useWorkspace } from "@/context/WorkspaceContext";
import MetricCard from "../components/MetricCard";

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

export default function MemberDashboard() {
  const { userId, userName, workspaceId } = useWorkspace();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
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
    load();
  }, [workspaceId, userId]);

  const total = tasks.length;
  const completed = tasks.filter((t) => t.status === "Done").length;
  const inProgress = tasks.filter((t) => t.status === "In Progress").length;
  const todo = tasks.filter((t) => t.status === "To Do").length;
  const completionRate = total ? Math.round((completed / total) * 100) : 0;

  const overdue = tasks.filter((t) => {
    if (!t.due_date || t.status === "Done") return false;
    return new Date(t.due_date) < new Date();
  });

  const upcoming = tasks
    .filter((t) => t.status !== "Done" && t.due_date && new Date(t.due_date) >= new Date())
    .sort((a, b) => a.due_date!.localeCompare(b.due_date!))
    .slice(0, 5);

  const statusColor = (s: string) => {
    const map: Record<string, string> = {
      "To Do": "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
      "In Progress": "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
      "In Review": "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300",
      Done: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300",
    };
    return map[s] ?? "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300";
  };

  const priorityColor = (p: string) => {
    const map: Record<string, string> = {
      High: "text-red-600 dark:text-red-400",
      Medium: "text-yellow-600 dark:text-yellow-400",
      Low: "text-green-600 dark:text-green-400",
    };
    return map[p] ?? "text-slate-500";
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
      <div>
        <h1 className="text-3xl font-black tracking-tight text-slate-900 dark:text-white">
          Welcome back, {userName?.split(" ")[0] ?? "Member"}
        </h1>
        <p className="text-slate-500 dark:text-slate-400 mt-1">
          Here&apos;s your task overview
        </p>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          icon="assignment"
          iconBg="bg-blue-100 dark:bg-blue-900/30"
          iconColor="text-blue-600 dark:text-blue-400"
          label="Total Tasks"
          value={String(total)}
          badge={`${todo} to do`}
          badgeType="neutral"
        />
        <MetricCard
          icon="pending"
          iconBg="bg-yellow-100 dark:bg-yellow-900/30"
          iconColor="text-yellow-600 dark:text-yellow-400"
          label="In Progress"
          value={String(inProgress)}
          badge={`${inProgress} active`}
          badgeType={inProgress > 0 ? "positive" : "neutral"}
        />
        <MetricCard
          icon="check_circle"
          iconBg="bg-green-100 dark:bg-green-900/30"
          iconColor="text-green-600 dark:text-green-400"
          label="Completed"
          value={String(completed)}
          badge={`${completionRate}%`}
          badgeType={completionRate >= 50 ? "positive" : "neutral"}
        />
        <MetricCard
          icon="playlist_add_check"
          iconBg="bg-slate-100 dark:bg-slate-800"
          iconColor="text-slate-600 dark:text-slate-400"
          label="To Do"
          value={String(todo)}
          badge={`${todo} remaining`}
          badgeType="neutral"
        />
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Overdue */}
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6">
          <div className="flex items-center gap-2 mb-4">
            <span className="material-symbols-outlined text-red-500">warning</span>
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
              Overdue ({overdue.length})
            </h2>
          </div>
          {overdue.length === 0 ? (
            <p className="text-sm text-slate-500 dark:text-slate-400 py-4 text-center">
              No overdue tasks — nice work!
            </p>
          ) : (
            <div className="space-y-3">
              {overdue.map((t) => (
                <div
                  key={t.id}
                  className="flex items-start justify-between gap-3 p-3 rounded-lg bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-900/30"
                >
                  <div className="min-w-0 flex-1">
                    <h4 className="text-sm font-medium text-slate-900 dark:text-white truncate">{t.title}</h4>
                    {t.project && (
                      <p className="text-xs text-slate-500 dark:text-slate-400">{t.project.name}</p>
                    )}
                  </div>
                  <div className="text-right shrink-0">
                    <span className={`text-xs font-medium ${priorityColor(t.priority)}`}>{t.priority}</span>
                    <p className="text-[10px] text-red-600 dark:text-red-400 mt-0.5">
                      Due {new Date(t.due_date!).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Upcoming */}
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6">
          <div className="flex items-center gap-2 mb-4">
            <span className="material-symbols-outlined text-blue-500">upcoming</span>
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
              Upcoming
            </h2>
          </div>
          {upcoming.length === 0 ? (
            <p className="text-sm text-slate-500 dark:text-slate-400 py-4 text-center">
              No upcoming deadlines
            </p>
          ) : (
            <div className="space-y-3">
              {upcoming.map((t) => (
                <div
                  key={t.id}
                  className="flex items-start justify-between gap-3 p-3 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                >
                  <div className="min-w-0 flex-1">
                    <h4 className="text-sm font-medium text-slate-900 dark:text-white truncate">{t.title}</h4>
                    {t.project && (
                      <p className="text-xs text-slate-500 dark:text-slate-400">{t.project.name}</p>
                    )}
                  </div>
                  <div className="text-right shrink-0">
                    <span className={`inline-block px-2 py-0.5 text-xs font-medium rounded-full ${statusColor(t.status)}`}>
                      {t.status}
                    </span>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                      {new Date(t.due_date!).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Recent tasks */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
          All Tasks
        </h2>
        {tasks.length === 0 ? (
          <p className="text-sm text-slate-500 dark:text-slate-400 py-8 text-center">
            No tasks assigned yet
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-700 text-left">
                  <th className="pb-3 font-semibold text-slate-500 dark:text-slate-400">Task</th>
                  <th className="pb-3 font-semibold text-slate-500 dark:text-slate-400">Project</th>
                  <th className="pb-3 font-semibold text-slate-500 dark:text-slate-400">Status</th>
                  <th className="pb-3 font-semibold text-slate-500 dark:text-slate-400">Priority</th>
                  <th className="pb-3 font-semibold text-slate-500 dark:text-slate-400">Due</th>
                </tr>
              </thead>
              <tbody>
                {tasks.map((t) => (
                  <tr key={t.id} className="border-b border-slate-100 dark:border-slate-800 last:border-0">
                    <td className="py-3 pr-4">
                      <p className="font-medium text-slate-900 dark:text-white">{t.title}</p>
                      {t.description && (
                        <p className="text-xs text-slate-500 dark:text-slate-400 truncate max-w-xs mt-0.5">{t.description}</p>
                      )}
                    </td>
                    <td className="py-3 pr-4 text-slate-600 dark:text-slate-400">
                      {t.project?.name ?? "—"}
                    </td>
                    <td className="py-3 pr-4">
                      <span className={`inline-block px-2 py-0.5 text-xs font-medium rounded-full ${statusColor(t.status)}`}>
                        {t.status}
                      </span>
                    </td>
                    <td className={`py-3 pr-4 font-medium ${priorityColor(t.priority)}`}>
                      {t.priority}
                    </td>
                    <td className="py-3 text-slate-500 dark:text-slate-400">
                      {t.due_date
                        ? new Date(t.due_date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
                        : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

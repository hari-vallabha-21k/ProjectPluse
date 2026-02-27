"use client";

import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useWorkspace } from "@/context/WorkspaceContext";
import MetricCard from "../components/MetricCard";
import ActivityTimeline from "../components/ActivityTimeline";

interface Project {
  id: string;
  name: string;
  description: string;
  status: string;
  priority: string;
  progress: number;
  due_date: string;
  created_at: string;
}

interface Task {
  id: string;
  title: string;
  status: string;
  priority: string;
  due_date: string;
  assigned_to: string | null;
  project: { name: string } | null;
}

export default function ManagerDashboard() {
  const { workspaceId } = useWorkspace();
  const [projects, setProjects] = useState<Project[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [memberCount, setMemberCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    const [projRes, taskRes, memRes] = await Promise.all([
      supabase
        .from("projects")
        .select("*")
        .eq("workspace_id", workspaceId)
        .order("created_at", { ascending: false }),
      supabase
        .from("tasks")
        .select("id, title, status, priority, due_date, assigned_to, project:projects(name)")
        .eq("workspace_id", workspaceId)
        .order("created_at", { ascending: false }),
      supabase
        .from("workspace_members")
        .select("*", { count: "exact", head: true })
        .eq("workspace_id", workspaceId),
    ]);
    if (projRes.data) setProjects(projRes.data);
    if (taskRes.data) {
      // Supabase returns joined relation as array — normalize to single object
      const normalized = (taskRes.data as unknown[]).map((t: any) => ({
        ...t,
        project: Array.isArray(t.project) ? t.project[0] ?? null : t.project,
      })) as Task[];
      setTasks(normalized);
    }
    setMemberCount(memRes.count || 0);
    setLoading(false);
  }, [workspaceId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const totalTasks = tasks.length;
  const completedTasks = tasks.filter((t) => t.status === "Done").length;
  const activeTasks = totalTasks - completedTasks;
  const completionRate =
    totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  const metrics = [
    {
      icon: "folder_open",
      iconBg: "bg-blue-50 dark:bg-blue-900/20",
      iconColor: "text-blue-600",
      label: "Total Projects",
      value: String(projects.length),
      badge:
        projects.filter((p) => p.status === "active").length + " active",
      badgeType:
        projects.length > 0
          ? ("positive" as const)
          : ("neutral" as const),
    },
    {
      icon: "task",
      iconBg: "bg-amber-50 dark:bg-amber-900/20",
      iconColor: "text-amber-600",
      label: "Active Tasks",
      value: String(activeTasks),
      badge: completedTasks + " done",
      badgeType:
        activeTasks > 0
          ? ("positive" as const)
          : ("neutral" as const),
    },
    {
      icon: "group",
      iconBg: "bg-purple-50 dark:bg-purple-900/20",
      iconColor: "text-purple-600",
      label: "Team Members",
      value: String(memberCount),
      badge: memberCount + " total",
      badgeType:
        memberCount > 0
          ? ("positive" as const)
          : ("neutral" as const),
    },
    {
      icon: "trending_up",
      iconBg: "bg-emerald-50 dark:bg-emerald-900/20",
      iconColor: "text-emerald-600",
      label: "Completion Rate",
      value: completionRate + "%",
      badge: completedTasks + "/" + totalTasks + " tasks",
      badgeType:
        completionRate >= 50
          ? ("positive" as const)
          : ("neutral" as const),
    },
  ];

  const getStatusColor = (s: string) => {
    switch (s) {
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
      case "High":
      case "high":
        return "text-red-600 dark:text-red-400";
      case "Medium":
      case "medium":
        return "text-orange-600 dark:text-orange-400";
      case "Low":
      case "low":
        return "text-green-600 dark:text-green-400";
      default:
        return "text-gray-600";
    }
  };

  const getTaskStatusColor = (s: string) => {
    switch (s) {
      case "To Do":
        return "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300";
      case "In Progress":
        return "bg-blue-100 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400";
      case "In Review":
        return "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-400";
      case "Done":
        return "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400";
      default:
        return "bg-gray-100 text-gray-700";
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
          <div className="animate-spin h-4 w-4 border-2 border-primary border-t-transparent rounded-full" />
          Loading dashboard...
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 lg:space-y-8">
      {/* Page Title */}
      <div>
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
          Dashboard Overview
        </h2>
        <p className="text-slate-500 dark:text-slate-400 mt-1">
          Monitor project performance and team velocity in real-time.
        </p>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 lg:gap-6">
        {metrics.map((metric, i) => (
          <MetricCard key={i} {...metric} />
        ))}
      </div>

      {/* Recent Projects */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
        <div className="p-4 sm:p-6 border-b border-slate-200 dark:border-slate-800">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
            Recent Projects
          </h3>
        </div>
        {projects.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center px-4">
            <span className="material-symbols-outlined text-5xl text-slate-300 dark:text-slate-600 mb-3">
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
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800">
                  <th className="text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider px-6 py-3">
                    Project
                  </th>
                  <th className="text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider px-6 py-3">
                    Status
                  </th>
                  <th className="text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider px-6 py-3 hidden sm:table-cell">
                    Priority
                  </th>
                  <th className="text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider px-6 py-3 hidden md:table-cell">
                    Due Date
                  </th>
                  <th className="text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider px-6 py-3 hidden lg:table-cell">
                    Progress
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                {projects.slice(0, 5).map((project) => (
                  <tr
                    key={project.id}
                    className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                  >
                    <td className="px-6 py-4">
                      <p className="text-sm font-semibold text-slate-900 dark:text-white">
                        {project.name}
                      </p>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(
                          project.status
                        )}`}
                      >
                        {project.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 hidden sm:table-cell">
                      <span
                        className={`flex items-center gap-1 text-xs font-medium ${getPriorityColor(
                          project.priority
                        )}`}
                      >
                        <span className="material-symbols-outlined text-sm">
                          flag
                        </span>
                        {project.priority}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-400 hidden md:table-cell">
                      {project.due_date}
                    </td>
                    <td className="px-6 py-4 hidden lg:table-cell">
                      <div className="flex items-center gap-2">
                        <div className="w-16 bg-slate-200 dark:bg-slate-700 rounded-full h-1.5">
                          <div
                            className="bg-primary h-1.5 rounded-full"
                            style={{ width: `${project.progress}%` }}
                          />
                        </div>
                        <span className="text-xs text-slate-500">
                          {project.progress}%
                        </span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Recent Tasks */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
        <div className="p-4 sm:p-6 border-b border-slate-200 dark:border-slate-800">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
            Recent Tasks
          </h3>
        </div>
        {tasks.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center px-4">
            <span className="material-symbols-outlined text-5xl text-slate-300 dark:text-slate-600 mb-3">
              assignment
            </span>
            <p className="text-lg font-semibold text-slate-500 dark:text-slate-400">
              No tasks yet
            </p>
            <p className="text-sm text-slate-400 dark:text-slate-500 mt-1">
              Create tasks from the Tasks page.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-200 dark:divide-slate-800">
            {tasks.slice(0, 8).map((task) => (
              <div
                key={task.id}
                className="p-4 sm:p-6 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-semibold text-slate-900 dark:text-white truncate">
                      {task.title}
                    </h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      {task.project?.name || "No project"} &middot; Due{" "}
                      {task.due_date}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span
                      className={`px-2 py-0.5 rounded-full text-xs font-medium ${getTaskStatusColor(
                        task.status
                      )}`}
                    >
                      {task.status.replace("_", " ")}
                    </span>
                    <span
                      className={`flex items-center gap-1 text-xs ${getPriorityColor(
                        task.priority
                      )}`}
                    >
                      <span className="material-symbols-outlined text-sm">
                        flag
                      </span>
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Activity Log Timeline */}
      <ActivityTimeline />
    </div>
  );
}

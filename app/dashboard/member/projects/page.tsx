"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useWorkspace } from "@/context/WorkspaceContext";

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

export default function MemberProjects() {
  const { workspaceId, userId } = useWorkspace();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");

  const fetchProjects = useCallback(async () => {
    /* Only fetch projects this member is assigned to */
    const { data: pmData } = await supabase
      .from("project_members")
      .select("project_id")
      .eq("user_id", userId);

    const projectIds = (pmData || []).map((pm) => pm.project_id);

    if (projectIds.length === 0) {
      setProjects([]);
      setLoading(false);
      return;
    }

    const { data } = await supabase
      .from("projects")
      .select("*")
      .in("id", projectIds)
      .eq("workspace_id", workspaceId)
      .order("created_at", { ascending: false });
    if (data) setProjects(data);
    setLoading(false);
  }, [workspaceId, userId]);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  const filtered =
    filter === "all" ? projects : projects.filter((p) => p.status === filter);

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

  const getPriorityIcon = (p: string) => {
    switch (p) {
      case "high":
        return "arrow_upward";
      case "medium":
        return "drag_handle";
      case "low":
        return "arrow_downward";
      default:
        return "drag_handle";
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
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-black tracking-tight text-slate-900 dark:text-white">
          Projects
        </h1>
        <p className="text-slate-500 dark:text-slate-400 mt-1">
          View all workspace projects and their progress
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        {[
          {
            label: "Total",
            value: projects.length,
            icon: "folder",
            bgClass: "bg-blue-500/10",
            textClass: "text-blue-500",
          },
          {
            label: "Active",
            value: projects.filter((p) => p.status === "active").length,
            icon: "play_circle",
            bgClass: "bg-emerald-500/10",
            textClass: "text-emerald-500",
          },
          {
            label: "Completed",
            value: projects.filter((p) => p.status === "completed").length,
            icon: "check_circle",
            bgClass: "bg-indigo-500/10",
            textClass: "text-indigo-500",
          },
          {
            label: "Paused",
            value: projects.filter((p) => p.status === "paused").length,
            icon: "pause_circle",
            bgClass: "bg-yellow-500/10",
            textClass: "text-yellow-500",
          },
        ].map((s) => (
          <div
            key={s.label}
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
                  {s.value}
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
      <div className="flex flex-wrap gap-2">
        {["all", "active", "completed", "paused"].map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filter === f
                ? "bg-primary text-white"
                : "bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-primary/50"
            }`}
          >
            {f === "all" ? "All Projects" : f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      {/* Project Cards */}
      {filtered.length === 0 ? (
        <div className="text-center py-16 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
          <span className="material-symbols-outlined text-5xl text-slate-300 dark:text-slate-600">
            folder_off
          </span>
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white mt-4">
            {filter === "all" ? "No projects yet" : `No ${filter} projects`}
          </h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Projects created by your manager will appear here.
          </p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((project) => (
            <div
              key={project.id}
              className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5 hover:border-primary/30 transition-colors"
            >
              <div className="flex items-start justify-between gap-3 mb-3">
                <h3 className="text-base font-semibold text-slate-900 dark:text-white line-clamp-1">
                  {project.name}
                </h3>
                <span
                  className={`shrink-0 px-2.5 py-0.5 rounded-full text-xs font-semibold ${getStatusColor(
                    project.status
                  )}`}
                >
                  {project.status}
                </span>
              </div>

              {project.description && (
                <p className="text-sm text-slate-500 dark:text-slate-400 line-clamp-2 mb-4">
                  {project.description}
                </p>
              )}

              {/* Progress bar */}
              <div className="mb-4">
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="text-slate-500 dark:text-slate-400">
                    Progress
                  </span>
                  <span className="font-semibold text-slate-700 dark:text-slate-300">
                    {project.progress}%
                  </span>
                </div>
                <div className="h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary rounded-full transition-all"
                    style={{ width: `${project.progress}%` }}
                  />
                </div>
              </div>

              {/* Meta */}
              <div className="flex items-center justify-between text-xs">
                <span
                  className={`flex items-center gap-0.5 font-medium ${getPriorityColor(
                    project.priority
                  )}`}
                >
                  <span className="material-symbols-outlined text-[14px]">
                    {getPriorityIcon(project.priority)}
                  </span>
                  {project.priority}
                </span>
                {project.due_date && (
                  <span className="flex items-center gap-1 text-slate-500 dark:text-slate-400">
                    <span className="material-symbols-outlined text-[14px]">
                      calendar_today
                    </span>
                    {new Date(project.due_date).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                    })}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

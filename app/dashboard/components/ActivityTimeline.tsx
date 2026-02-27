"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useWorkspace } from "@/context/WorkspaceContext";

interface ActivityLog {
    id: string;
    user_email: string;
    action: string;
    entity_type: string;
    metadata: Record<string, unknown>;
    created_at: string;
}

const entityIcons: Record<string, string> = {
    project: "folder_open",
    task: "task",
    member: "person",
    invite: "mail",
    workspace: "workspaces",
};

const entityColors: Record<string, string> = {
    project: "bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400",
    task: "bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400",
    member: "bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400",
    invite: "bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400",
    workspace: "bg-indigo-100 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400",
};

function timeAgo(dateStr: string): string {
    const now = new Date();
    const date = new Date(dateStr);
    const diffMs = now.getTime() - date.getTime();
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHr = Math.floor(diffMin / 60);
    const diffDays = Math.floor(diffHr / 24);

    if (diffSec < 10) return "just now";
    if (diffSec < 60) return `${diffSec}s ago`;
    if (diffMin < 60) return `${diffMin}m ago`;
    if (diffHr < 24) return `${diffHr}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
}

export default function ActivityTimeline() {
    const { workspaceId } = useWorkspace();
    const [logs, setLogs] = useState<ActivityLog[]>([]);
    const [loading, setLoading] = useState(true);

    /* Fetch initial logs */
    useEffect(() => {
        const fetchLogs = async () => {
            const { data } = await supabase
                .from("activity_logs")
                .select("id, user_email, action, entity_type, metadata, created_at")
                .eq("workspace_id", workspaceId)
                .order("created_at", { ascending: false })
                .limit(20);

            if (data) setLogs(data);
            setLoading(false);
        };

        fetchLogs();
    }, [workspaceId]);

    /* Real-time subscription */
    useEffect(() => {
        const channel = supabase
            .channel("activity-logs-realtime")
            .on(
                "postgres_changes",
                {
                    event: "INSERT",
                    schema: "public",
                    table: "activity_logs",
                    filter: `workspace_id=eq.${workspaceId}`,
                },
                (payload) => {
                    const newLog = payload.new as ActivityLog;
                    setLogs((prev) => [newLog, ...prev].slice(0, 20));
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [workspaceId]);

    if (loading) {
        return (
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6">
                <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
                    <div className="animate-spin h-4 w-4 border-2 border-primary border-t-transparent rounded-full" />
                    Loading activity...
                </div>
            </div>
        );
    }

    return (
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
            <div className="p-4 sm:p-6 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-primary text-xl">
                        history
                    </span>
                    <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                        Activity Log
                    </h3>
                </div>
                <span className="flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                    <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span>
                    Live
                </span>
            </div>

            {logs.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center px-4">
                    <span className="material-symbols-outlined text-4xl text-slate-300 dark:text-slate-600 mb-3">
                        timeline
                    </span>
                    <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
                        No activity yet
                    </p>
                    <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
                        Activities will appear here as your team works.
                    </p>
                </div>
            ) : (
                <div className="divide-y divide-slate-100 dark:divide-slate-800 max-h-[480px] overflow-y-auto">
                    {logs.map((log) => {
                        const icon = entityIcons[log.entity_type] || "info";
                        const color = entityColors[log.entity_type] || "bg-slate-100 text-slate-600";
                        const userName = log.user_email?.split("@")[0] || "Someone";
                        const metaName =
                            (log.metadata as Record<string, string>)?.name ||
                            (log.metadata as Record<string, string>)?.title ||
                            "";

                        return (
                            <div
                                key={log.id}
                                className="p-4 sm:px-6 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors flex items-start gap-3"
                            >
                                {/* Icon */}
                                <div
                                    className={`flex-shrink-0 w-9 h-9 rounded-lg flex items-center justify-center ${color}`}
                                >
                                    <span className="material-symbols-outlined text-lg">
                                        {icon}
                                    </span>
                                </div>

                                {/* Content */}
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm text-slate-700 dark:text-slate-300">
                                        <span className="font-semibold text-slate-900 dark:text-white">
                                            {userName}
                                        </span>{" "}
                                        {log.action}
                                        {metaName && (
                                            <>
                                                {" "}
                                                <span className="font-medium text-slate-900 dark:text-white">
                                                    &ldquo;{metaName}&rdquo;
                                                </span>
                                            </>
                                        )}
                                    </p>
                                    <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
                                        {timeAgo(log.created_at)}
                                    </p>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}

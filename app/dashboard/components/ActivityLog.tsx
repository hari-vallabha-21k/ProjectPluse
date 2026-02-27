"use client";

import { useDashboard } from "@/context/DashboardContext";

export default function ActivityLog() {
  const { activities } = useDashboard();
  const recent = activities.slice(0, 8);

  return (
    <div className="space-y-4">
      <h3 className="font-bold text-slate-900 dark:text-white">Recent Activity</h3>
      <div className="bg-white dark:bg-slate-900 p-4 sm:p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
        {recent.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <span className="material-symbols-outlined text-3xl text-slate-300 dark:text-slate-600 mb-2">history</span>
            <p className="text-sm font-medium text-slate-500 dark:text-slate-400">No recent activity</p>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">Activity from your team will appear here.</p>
          </div>
        ) : (
          <div className="space-y-5">
            {recent.map((activity, idx) => (
              <div
                key={activity.id}
                className={`relative pl-8 ${
                  idx < recent.length - 1
                    ? "before:content-[''] before:absolute before:left-[11px] before:top-8 before:bottom-[-20px] before:w-[2px] before:bg-slate-100 dark:before:bg-slate-800"
                    : ""
                }`}
              >
                <div className={`absolute left-0 top-0 w-6 h-6 ${activity.iconBg} ${activity.iconColor} rounded-full flex items-center justify-center`}>
                  <span className="material-symbols-outlined text-sm">{activity.icon}</span>
                </div>
                <p className="text-sm text-slate-700 dark:text-slate-300">{activity.text}</p>
                <span className="text-xs text-slate-400">{activity.time}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

"use client";

import { useDashboard } from "@/context/DashboardContext";

export default function ProjectTable() {
  const { projects } = useDashboard();
  const recent = projects.slice(0, 5);

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

  return (
    <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
      <div className="px-4 sm:px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
        <h3 className="font-bold text-slate-900 dark:text-white">
          Recent Projects
        </h3>
        <button className="text-primary text-sm font-semibold hover:underline">
          View all
        </button>
      </div>

      {recent.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
          <span className="material-symbols-outlined text-4xl text-slate-300 dark:text-slate-600 mb-3">folder_off</span>
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400">No projects yet</p>
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">Create your first project to see it here.</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50 dark:bg-slate-800/50">
                <th className="px-4 sm:px-6 py-3 text-xs font-bold text-slate-500 uppercase">Project Name</th>
                <th className="px-4 sm:px-6 py-3 text-xs font-bold text-slate-500 uppercase hidden sm:table-cell">Members</th>
                <th className="px-4 sm:px-6 py-3 text-xs font-bold text-slate-500 uppercase">Progress</th>
                <th className="px-4 sm:px-6 py-3 text-xs font-bold text-slate-500 uppercase hidden md:table-cell">Due Date</th>
                <th className="px-4 sm:px-6 py-3 text-xs font-bold text-slate-500 uppercase">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {recent.map((p) => (
                <tr key={p.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                  <td className="px-4 sm:px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                        <span className="material-symbols-outlined text-sm">folder</span>
                      </div>
                      <span className="text-sm font-semibold text-slate-900 dark:text-white truncate max-w-[160px]">{p.name}</span>
                    </div>
                  </td>
                  <td className="px-4 sm:px-6 py-4 hidden sm:table-cell">
                    <span className="text-sm text-slate-600 dark:text-slate-400">{p.teamMembers}</span>
                  </td>
                  <td className="px-4 sm:px-6 py-4">
                    <div className="flex items-center gap-2">
                      <div className="w-full max-w-[80px] h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                        <div className="h-full bg-primary rounded-full" style={{ width: `${p.progress}%` }} />
                      </div>
                      <span className="text-xs text-slate-500">{p.progress}%</span>
                    </div>
                  </td>
                  <td className="px-4 sm:px-6 py-4 text-sm text-slate-600 dark:text-slate-400 hidden md:table-cell">
                    {p.dueDate}
                  </td>
                  <td className="px-4 sm:px-6 py-4">
                    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${getStatusColor(p.status)}`}>
                      {p.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

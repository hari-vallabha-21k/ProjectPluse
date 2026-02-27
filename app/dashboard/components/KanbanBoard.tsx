"use client";

import { useDashboard } from "@/context/DashboardContext";

function EmptyColumn({ label }: { label: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-8 text-center">
      <span className="material-symbols-outlined text-2xl text-slate-300 dark:text-slate-600 mb-1">inbox</span>
      <p className="text-xs text-slate-400 dark:text-slate-500">No {label.toLowerCase()} items</p>
    </div>
  );
}

const priorityTag = (p: string) => {
  switch (p) {
    case "high":
      return { bg: "bg-red-50 dark:bg-red-900/20", color: "text-red-600 dark:text-red-400" };
    case "medium":
      return { bg: "bg-orange-50 dark:bg-orange-900/20", color: "text-orange-600 dark:text-orange-400" };
    default:
      return { bg: "bg-green-50 dark:bg-green-900/20", color: "text-green-600 dark:text-green-400" };
  }
};

export default function KanbanBoard() {
  const { tasks } = useDashboard();

  const todoCards = tasks.filter((t) => t.status === "todo");
  const doingCards = tasks.filter((t) => t.status === "in_progress" || t.status === "review");
  const doneCards = tasks.filter((t) => t.status === "completed");

  return (
    <div className="lg:col-span-2 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-bold text-slate-900 dark:text-white">Active Board Preview</h3>
        <button className="text-slate-500 hover:text-primary transition-colors">
          <span className="material-symbols-outlined">open_in_new</span>
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* To Do */}
        <div className="space-y-3">
          <div className="flex items-center justify-between px-2">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">To Do ({todoCards.length})</span>
          </div>
          {todoCards.length === 0 ? (
            <EmptyColumn label="To Do" />
          ) : (
            todoCards.slice(0, 4).map((card) => {
              const tag = priorityTag(card.priority);
              return (
                <div key={card.id} className="bg-white dark:bg-slate-900 p-4 rounded-lg border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
                  <div className="flex justify-between items-start">
                    <span className={`text-[10px] ${tag.bg} px-2 py-0.5 rounded ${tag.color} font-bold uppercase`}>{card.priority}</span>
                    <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-[8px] font-bold text-primary">
                      {card.assignee.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase()}
                    </div>
                  </div>
                  <p className="text-sm font-medium leading-tight text-slate-900 dark:text-white">{card.title}</p>
                </div>
              );
            })
          )}
        </div>

        {/* Doing */}
        <div className="space-y-3">
          <div className="flex items-center justify-between px-2">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Doing ({doingCards.length})</span>
          </div>
          {doingCards.length === 0 ? (
            <EmptyColumn label="Doing" />
          ) : (
            doingCards.slice(0, 4).map((card) => {
              const tag = priorityTag(card.priority);
              return (
                <div key={card.id} className="bg-white dark:bg-slate-900 p-4 rounded-lg border-l-4 border-l-primary border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
                  <div className="flex justify-between items-start">
                    <span className={`text-[10px] ${tag.bg} px-2 py-0.5 rounded ${tag.color} font-bold uppercase`}>{card.priority}</span>
                    <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-[8px] font-bold text-primary">
                      {card.assignee.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase()}
                    </div>
                  </div>
                  <p className="text-sm font-medium leading-tight text-slate-900 dark:text-white">{card.title}</p>
                </div>
              );
            })
          )}
        </div>

        {/* Done */}
        <div className="space-y-3">
          <div className="flex items-center justify-between px-2">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Done ({doneCards.length})</span>
          </div>
          {doneCards.length === 0 ? (
            <EmptyColumn label="Done" />
          ) : (
            doneCards.slice(0, 4).map((card) => {
              const tag = priorityTag(card.priority);
              return (
                <div key={card.id} className="bg-slate-50/50 dark:bg-slate-800/50 p-4 rounded-lg border border-dashed border-slate-200 dark:border-slate-700 space-y-3 opacity-60">
                  <div className="flex justify-between items-start">
                    <span className={`text-[10px] ${tag.bg} px-2 py-0.5 rounded ${tag.color} font-bold uppercase`}>{card.priority}</span>
                    <span className="material-symbols-outlined text-emerald-500 text-sm">check_circle</span>
                  </div>
                  <p className="text-sm font-medium leading-tight text-slate-900 dark:text-white">{card.title}</p>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}

"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { useWorkspace } from "@/context/WorkspaceContext";

interface NavItem {
  label: string;
  icon: string;
  href: string;
}

const managerNav: NavItem[] = [
  { label: "Dashboard", icon: "dashboard", href: "/dashboard/manager" },
  { label: "Projects", icon: "folder", href: "/dashboard/manager/projects" },
  { label: "Team", icon: "group", href: "/dashboard/manager/team" },
  { label: "Tasks", icon: "checklist", href: "/dashboard/manager/tasks" },
  { label: "Calendar", icon: "calendar_today", href: "/dashboard/manager/calendar" },
  { label: "Chat", icon: "chat_bubble", href: "/dashboard/manager/chat" },
];

const memberNav: NavItem[] = [
  { label: "Dashboard", icon: "dashboard", href: "/dashboard/member" },
  { label: "My Tasks", icon: "task_alt", href: "/dashboard/member/my-tasks" },
  { label: "Projects", icon: "folder", href: "/dashboard/member/projects" },
  { label: "Calendar", icon: "calendar_today", href: "/dashboard/member/calendar" },
  { label: "Chat", icon: "chat_bubble", href: "/dashboard/member/chat" },
];

interface SidebarProps {
  open: boolean;
  onClose: () => void;
}

export default function Sidebar({ open, onClose }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { userName, userRole, workspaceId, allWorkspaces, switchWorkspace } =
    useWorkspace();
  const [wsDropdownOpen, setWsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const navItems = userRole === "manager" ? managerNav : memberNav;
  const consoleLabel =
    userRole === "manager" ? "Manager Console" : "Member Console";

  const activeWs = allWorkspaces.find((w) => w.id === workspaceId);

  const initials = (() => {
    const parts = userName.split(" ");
    return parts.length >= 2
      ? `${parts[0][0]}${parts[1][0]}`.toUpperCase()
      : userName.slice(0, 2).toUpperCase();
  })();

  /* Close dropdown on outside click */
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        setWsDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  return (
    <aside
      className={`fixed left-0 top-0 h-full w-64 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex flex-col z-50 transition-transform duration-200 ${open ? "translate-x-0" : "-translate-x-full"
        } md:translate-x-0`}
    >
      {/* Brand */}
      <div className="p-6 pb-3">
        <div className="flex items-center gap-3 mb-1">
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center text-white">
            <span className="material-symbols-outlined text-xl">bolt</span>
          </div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
            ProjectPulse
          </h1>
        </div>
        <p className="text-[10px] font-bold text-slate-400 tracking-widest uppercase ml-11">
          {consoleLabel}
        </p>
      </div>

      {/* Workspace Switcher */}
      <div className="px-4 pb-4" ref={dropdownRef}>
        <button
          onClick={() => setWsDropdownOpen(!wsDropdownOpen)}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
        >
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-primary text-lg">
              workspaces
            </span>
          </div>
          <div className="flex-1 text-left min-w-0">
            <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">
              {activeWs?.name || "Workspace"}
            </p>
            <p className="text-[10px] text-slate-500 dark:text-slate-400 capitalize">
              {activeWs?.role || userRole}
            </p>
          </div>
          <span className="material-symbols-outlined text-slate-400 text-lg shrink-0">
            {wsDropdownOpen ? "expand_less" : "unfold_more"}
          </span>
        </button>

        {/* Dropdown */}
        {wsDropdownOpen && (
          <div className="mt-2 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-xl shadow-black/10 dark:shadow-black/30 overflow-hidden">
            <div className="px-3 py-2 border-b border-slate-100 dark:border-slate-700">
              <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                Your Workspaces ({allWorkspaces.length})
              </p>
            </div>
            <div className="py-1 max-h-48 overflow-y-auto">
              {allWorkspaces.map((ws) => {
                const isActive = ws.id === workspaceId;
                return (
                  <button
                    key={ws.id}
                    onClick={() => {
                      if (!isActive) {
                        switchWorkspace(ws.id);
                      }
                      setWsDropdownOpen(false);
                    }}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 text-left transition-colors ${isActive
                        ? "bg-primary/5 dark:bg-primary/10"
                        : "hover:bg-slate-50 dark:hover:bg-slate-700/50"
                      }`}
                  >
                    <div
                      className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${isActive
                          ? "bg-primary text-white"
                          : "bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400"
                        }`}
                    >
                      <span className="text-xs font-bold uppercase">
                        {ws.name.charAt(0)}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p
                        className={`text-sm font-medium truncate ${isActive
                            ? "text-primary"
                            : "text-slate-700 dark:text-slate-300"
                          }`}
                      >
                        {ws.name}
                      </p>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400 capitalize">
                        {ws.role}
                      </p>
                    </div>
                    {isActive && (
                      <span className="material-symbols-outlined text-primary text-lg">
                        check_circle
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-4 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onClose}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg font-medium transition-colors ${isActive
                  ? "bg-primary/10 text-primary"
                  : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                }`}
            >
              <span className="material-symbols-outlined">{item.icon}</span>
              <span className="text-sm">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Bottom */}
      <div className="p-4 border-t border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-3 p-2 bg-slate-50 dark:bg-slate-800/50 rounded-xl">
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold text-sm border border-slate-200 shadow-sm">
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold truncate">{userName}</p>
            <p className="text-xs text-slate-500 truncate capitalize">
              {userRole}
            </p>
          </div>
          <button
            onClick={handleLogout}
            className="text-slate-400 hover:text-slate-600"
            title="Logout"
          >
            <span className="material-symbols-outlined text-xl">logout</span>
          </button>
        </div>
      </div>
    </aside>
  );
}

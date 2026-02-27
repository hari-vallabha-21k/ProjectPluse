"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  type ReactNode,
} from "react";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export interface Project {
  id: string;
  name: string;
  description: string;
  status: "active" | "completed" | "paused";
  progress: number;
  dueDate: string;
  teamMembers: number;
  priority: "high" | "medium" | "low";
  createdAt: string;
}

export interface Task {
  id: string;
  title: string;
  description: string;
  assignee: string;
  projectId: string;
  projectName: string;
  priority: "high" | "medium" | "low";
  status: "todo" | "in_progress" | "review" | "completed";
  dueDate: string;
  createdAt: string;
}

export interface Activity {
  id: string;
  icon: string;
  iconBg: string;
  iconColor: string;
  text: string;
  time: string;
}

export interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: string;
  avatar: string;
  status: "active" | "away" | "busy";
  tasksAssigned: number;
  tasksCompleted: number;
}

export interface CalendarEvent {
  id: string;
  title: string;
  type: "meeting" | "deadline" | "review" | "milestone";
  date: string;
  time: string;
  duration: string;
  attendees: string[];
  project: string;
  description: string;
  meetLink?: string;
}

/* ------------------------------------------------------------------ */
/*  Context value shape                                                */
/* ------------------------------------------------------------------ */

interface DashboardContextValue {
  /* Data */
  projects: Project[];
  tasks: Task[];
  activities: Activity[];
  teamMembers: TeamMember[];
  events: CalendarEvent[];

  /* Mutators */
  createProject: (p: Omit<Project, "id" | "createdAt" | "progress">) => void;
  updateProject: (id: string, data: Partial<Project>) => void;
  deleteProject: (id: string) => void;

  createTask: (t: Omit<Task, "id" | "createdAt">) => void;
  updateTask: (id: string, data: Partial<Task>) => void;
  deleteTask: (id: string) => void;

  addMember: (m: Omit<TeamMember, "id" | "tasksAssigned" | "tasksCompleted">) => void;
  addEvent: (e: Omit<CalendarEvent, "id">) => void;
  deleteEvent: (id: string) => void;
}

const DashboardContext = createContext<DashboardContextValue | null>(null);

/* ------------------------------------------------------------------ */
/*  Hook                                                               */
/* ------------------------------------------------------------------ */

export function useDashboard() {
  const ctx = useContext(DashboardContext);
  if (!ctx)
    throw new Error("useDashboard must be used inside <DashboardProvider>");
  return ctx;
}

/* ------------------------------------------------------------------ */
/*  Helper                                                             */
/* ------------------------------------------------------------------ */

const uid = () => Math.random().toString(36).slice(2, 10);
const now = () => new Date().toISOString();
const timeAgo = () => "Just now";

/* ------------------------------------------------------------------ */
/*  Provider                                                           */
/* ------------------------------------------------------------------ */

export function DashboardProvider({ children }: { children: ReactNode }) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [events, setEvents] = useState<CalendarEvent[]>([]);

  /* ---------- helpers ------------------------------------------------ */

  const pushActivity = useCallback(
    (icon: string, iconBg: string, iconColor: string, text: string) => {
      setActivities((prev) => [
        { id: uid(), icon, iconBg, iconColor, text, time: timeAgo() },
        ...prev,
      ]);
    },
    [],
  );

  /* ---------- project ------------------------------------------------ */

  const createProject = useCallback(
    (p: Omit<Project, "id" | "createdAt" | "progress">) => {
      const project: Project = {
        ...p,
        id: uid(),
        progress: 0,
        createdAt: now(),
      };
      setProjects((prev) => [project, ...prev]);
      pushActivity(
        "add_circle",
        "bg-blue-100 dark:bg-blue-900/20",
        "text-blue-600",
        `Project "${project.name}" was created`,
      );
    },
    [pushActivity],
  );

  const updateProject = useCallback((id: string, data: Partial<Project>) => {
    setProjects((prev) =>
      prev.map((p) => (p.id === id ? { ...p, ...data } : p)),
    );
  }, []);

  const deleteProject = useCallback(
    (id: string) => {
      setProjects((prev) => {
        const project = prev.find((p) => p.id === id);
        if (project) {
          pushActivity(
            "delete",
            "bg-red-100 dark:bg-red-900/20",
            "text-red-600",
            `Project "${project.name}" was deleted`,
          );
        }
        return prev.filter((p) => p.id !== id);
      });
      setTasks((prev) => prev.filter((t) => t.projectId !== id));
    },
    [pushActivity],
  );

  /* ---------- task --------------------------------------------------- */

  const createTask = useCallback(
    (t: Omit<Task, "id" | "createdAt">) => {
      const task: Task = { ...t, id: uid(), createdAt: now() };
      setTasks((prev) => [task, ...prev]);
      pushActivity(
        "check_circle",
        "bg-emerald-100 dark:bg-emerald-900/20",
        "text-emerald-600",
        `Task "${task.title}" added to ${task.projectName}`,
      );
    },
    [pushActivity],
  );

  const updateTask = useCallback((id: string, data: Partial<Task>) => {
    setTasks((prev) =>
      prev.map((t) => (t.id === id ? { ...t, ...data } : t)),
    );
  }, []);

  const deleteTask = useCallback(
    (id: string) => {
      setTasks((prev) => {
        const task = prev.find((t) => t.id === id);
        if (task) {
          pushActivity(
            "delete",
            "bg-red-100 dark:bg-red-900/20",
            "text-red-600",
            `Task "${task.title}" was deleted`,
          );
        }
        return prev.filter((t) => t.id !== id);
      });
    },
    [pushActivity],
  );

  /* ---------- team --------------------------------------------------- */

  const addMember = useCallback(
    (m: Omit<TeamMember, "id" | "tasksAssigned" | "tasksCompleted">) => {
      const member: TeamMember = {
        ...m,
        id: uid(),
        tasksAssigned: 0,
        tasksCompleted: 0,
      };
      setTeamMembers((prev) => [member, ...prev]);
      pushActivity(
        "person_add",
        "bg-purple-100 dark:bg-purple-900/20",
        "text-purple-600",
        `${member.name} was added to the team`,
      );
    },
    [pushActivity],
  );

  /* ---------- events ------------------------------------------------- */

  const addEvent = useCallback(
    (e: Omit<CalendarEvent, "id">) => {
      const event: CalendarEvent = { ...e, id: uid() };
      setEvents((prev) => [event, ...prev]);
      pushActivity(
        "event",
        "bg-orange-100 dark:bg-orange-900/20",
        "text-orange-600",
        `Event "${event.title}" was scheduled`,
      );
    },
    [pushActivity],
  );

  const deleteEvent = useCallback(
    (id: string) => {
      setEvents((prev) => {
        const event = prev.find((e) => e.id === id);
        if (event) {
          pushActivity(
            "delete",
            "bg-red-100 dark:bg-red-900/20",
            "text-red-600",
            `Event "${event.title}" was removed`,
          );
        }
        return prev.filter((e) => e.id !== id);
      });
    },
    [pushActivity],
  );

  /* ---------- value -------------------------------------------------- */

  return (
    <DashboardContext.Provider
      value={{
        projects,
        tasks,
        activities,
        teamMembers,
        events,
        createProject,
        updateProject,
        deleteProject,
        createTask,
        updateTask,
        deleteTask,
        addMember,
        addEvent,
        deleteEvent,
      }}
    >
      {children}
    </DashboardContext.Provider>
  );
}

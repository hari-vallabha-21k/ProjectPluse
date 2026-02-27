"use client";

import { createContext, useContext, type ReactNode } from "react";

export interface WorkspaceInfo {
  id: string;
  name: string;
  role: "manager" | "member";
}

export interface WorkspaceContextValue {
  workspaceId: string;
  userId: string;
  userRole: "manager" | "member";
  userEmail: string;
  userName: string;
  allWorkspaces: WorkspaceInfo[];
  switchWorkspace: (workspaceId: string) => void;
}

const WorkspaceContext = createContext<WorkspaceContextValue | null>(null);

export function useWorkspace() {
  const ctx = useContext(WorkspaceContext);
  if (!ctx) throw new Error("useWorkspace must be used inside dashboard layout");
  return ctx;
}

export function WorkspaceProvider({
  value,
  children,
}: {
  value: WorkspaceContextValue;
  children: ReactNode;
}) {
  return (
    <WorkspaceContext.Provider value={value}>
      {children}
    </WorkspaceContext.Provider>
  );
}

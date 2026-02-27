"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useWorkspace } from "@/context/WorkspaceContext";

export default function DashboardPage() {
  const router = useRouter();
  const { userRole } = useWorkspace();

  useEffect(() => {
    router.replace(
      userRole === "manager" ? "/dashboard/manager" : "/dashboard/member"
    );
  }, [router, userRole]);

  return (
    <div className="flex h-64 items-center justify-center">
      <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
        <div className="animate-spin h-4 w-4 border-2 border-primary border-t-transparent rounded-full"></div>
        Redirecting...
      </div>
    </div>
  );
}

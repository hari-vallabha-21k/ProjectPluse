import { supabase } from "@/lib/supabaseClient";

export type EntityType = "project" | "task" | "member" | "invite" | "workspace";

interface LogActivityParams {
    workspaceId: string;
    userId: string;
    userEmail?: string;
    action: string;
    entityType: EntityType;
    entityId?: string;
    metadata?: Record<string, unknown>;
}

/**
 * Log an activity to the audit trail.
 *
 * Usage:
 *   logActivity({
 *     workspaceId: "...",
 *     userId: "...",
 *     userEmail: "hari@example.com",
 *     action: "created project",
 *     entityType: "project",
 *     entityId: project.id,
 *     metadata: { name: "My Project" },
 *   });
 */
export async function logActivity({
    workspaceId,
    userId,
    userEmail,
    action,
    entityType,
    entityId,
    metadata,
}: LogActivityParams) {
    const { error } = await supabase.from("activity_logs").insert({
        workspace_id: workspaceId,
        user_id: userId,
        user_email: userEmail || "",
        action,
        entity_type: entityType,
        entity_id: entityId || null,
        metadata: metadata || {},
    });

    if (error) {
        console.error("Failed to log activity:", error);
    }
}

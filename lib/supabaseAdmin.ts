import { createClient } from "@supabase/supabase-js";

/**
 * Server-side Supabase client with the service role key.
 * This bypasses RLS and can call admin auth methods.
 * NEVER import this in client-side code.
 */
export const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
);

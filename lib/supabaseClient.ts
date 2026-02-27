import { createClient } from "@/lib/supabase/client";

// Re-export a singleton browser client so every `import { supabase }` keeps working.
export const supabase = createClient();

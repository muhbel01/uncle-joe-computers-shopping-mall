import { createClient } from "@supabase/supabase-js";
import { hasSupabasePublicConfig, publicEnv } from "@/lib/env";

export function getPublicSupabaseClient() {
  if (!hasSupabasePublicConfig()) return null;

  return createClient(
    publicEnv.NEXT_PUBLIC_SUPABASE_URL!,
    publicEnv.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
    },
  );
}

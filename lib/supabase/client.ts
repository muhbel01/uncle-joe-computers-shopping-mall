import { createBrowserClient } from "@supabase/ssr";
import { publicEnv, hasSupabasePublicConfig } from "@/lib/env";

export function createClient() {
  if (!hasSupabasePublicConfig()) {
    throw new Error("Supabase public environment variables are not configured.");
  }

  return createBrowserClient(
    publicEnv.NEXT_PUBLIC_SUPABASE_URL!,
    publicEnv.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
  );
}

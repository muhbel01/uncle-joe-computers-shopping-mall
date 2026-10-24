import { createCheckoutPostHandler } from "@/lib/checkout-route";
import { createClient as createSupabaseClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

export const POST = createCheckoutPostHandler({
  createClient: createSupabaseClient,
});

import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import { getSupabaseEnv } from "@/lib/supabase/env";
import type { Database } from "@/lib/supabase/database.types";
export const dynamic = "force-dynamic";
const headers = {
  "Cache-Control": "private, no-store",
  "X-Content-Type-Options": "nosniff",
};
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const env = getSupabaseEnv();
  if (!env || !z.string().uuid().safeParse(id).success)
    return new Response(null, { status: 404, headers });
  const supabase = createClient<Database>(env.url, env.key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: profile, error } = await supabase
    .from("public_profiles")
    .select("photo_url")
    .eq("id", id)
    .maybeSingle();
  if (error || !profile?.photo_url)
    return new Response(null, { status: 404, headers });
  const { data, error: downloadError } = await supabase.storage
    .from("profile-media")
    .download(profile.photo_url);
  if (downloadError || !data)
    return new Response(null, { status: 404, headers });
  return new Response(data, {
    headers: { ...headers, "Content-Type": "image/webp" },
  });
}

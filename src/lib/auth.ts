import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "./supabase/server";
import { getSupabaseEnv } from "./supabase/env";

export const requireUser = cache(async () => {
  if (!getSupabaseEnv()) redirect("/login");
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error || !user) redirect("/login");
  return { supabase, user };
});
export function siteOrigin() {
  const origin = process.env.NEXT_PUBLIC_SITE_URL;
  if (!origin)
    throw new Error(
      "NEXT_PUBLIC_SITE_URL is required for authentication redirects.",
    );
  const url = new URL(origin);
  if (
    url.protocol !== "https:" &&
    !(
      url.protocol === "http:" &&
      ["localhost", "127.0.0.1"].includes(url.hostname)
    )
  )
    throw new Error("Use HTTPS for the production site URL.");
  return url.origin;
}

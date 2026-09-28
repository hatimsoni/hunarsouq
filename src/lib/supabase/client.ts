"use client";
import { createBrowserClient } from "@supabase/ssr";
import { getSupabaseEnv } from "./env";
import type { Database } from "./database.types";

export function createClient() {
  const env = getSupabaseEnv();
  if (!env)
    throw new Error("Add Supabase environment variables to .env.local first.");
  return createBrowserClient<Database>(env.url, env.key);
}

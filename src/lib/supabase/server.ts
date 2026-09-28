import "server-only";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { getSupabaseEnv } from "./env";
import type { Database } from "./database.types";

export async function createClient() {
  const env = getSupabaseEnv();
  if (!env)
    throw new Error("Add Supabase environment variables to .env.local first.");
  const cookieStore = await cookies();
  return createServerClient<Database>(env.url, env.key, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll(values) {
        try {
          values.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options),
          );
        } catch {
          /* Read-only Server Components rely on src/proxy.ts to persist refreshed sessions. */
        }
      },
    },
  });
}

import "server-only";
import { cache } from "react";
import { createClient } from "@supabase/supabase-js";
import { getSupabaseEnv } from "./supabase/env";
import type { Database, PublicProfile } from "./supabase/database.types";
import type { directoryFilters } from "./directory-filters";

// Deliberately no session: public routes see only the public allowlist, even for admins.
export function publicClient() {
  const env = getSupabaseEnv();
  return env
    ? createClient<Database>(env.url, env.key, {
        auth: { persistSession: false, autoRefreshToken: false },
        global: {
          fetch: (input, init) =>
            fetch(input, {
              ...init,
              cache: "no-store",
              signal: AbortSignal.timeout(8000),
            }),
        },
      })
    : null;
}
export const getPublicProfile = cache(async (username: string) => {
  if (!/^[a-z][a-z0-9_]{2,29}$/.test(username)) return null;
  const db = publicClient();
  if (!db) return null;
  const { data, error } = await db
    .from("public_profiles")
    .select("*")
    .eq("username", username)
    .maybeSingle();
  if (error)
    throw new Error("The community directory is temporarily unavailable.");
  return data;
});
export async function getDirectory(
  filters: ReturnType<typeof directoryFilters>,
) {
  const db = publicClient();
  if (!db)
    return {
      members: [] as (PublicProfile & { category_name: string })[],
      total: 0,
      cities: [] as string[],
      unavailable: true,
    };
  const [result, cities] = await Promise.all([
    db.rpc("search_hunar", {
      keyword: filters.q,
      skill: filters.skill,
      city_filter: filters.city,
      availability_filter: filters.availability,
      page_number: filters.page,
    }),
    db.rpc("hunar_cities"),
  ]);
  if (result.error || !result.data)
    throw new Error("The community directory is temporarily unavailable.");
  const data = result.data as {
    total: number;
    members: (PublicProfile & { category_name: string })[];
  };
  return {
    ...data,
    cities: cities.data?.map((item) => item.city) ?? [],
    unavailable: false,
  };
}

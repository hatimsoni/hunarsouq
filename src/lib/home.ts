import "server-only";
import { createClient } from "@supabase/supabase-js";
import { unstable_cache } from "next/cache";
import { categories } from "./categories";
import { getSupabaseEnv } from "./supabase/env";
import type { Database } from "./supabase/database.types";

// Phase 1 deliberately has no profile/business/course data. Never invent member counts.
export const getHomeData = unstable_cache(
  async () => {
    const env = getSupabaseEnv();
    if (!env) return { categories, source: "preview" as const };
    const supabase = createClient<Database>(env.url, env.key, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data, error } = await supabase
      .from("categories")
      .select("id,slug,name,description,icon,sort_order")
      .order("sort_order");
    if (error) {
      console.error("Category fetch failed:", error.code);
      return { categories, source: "unavailable" as const };
    }
    return { categories: data, source: "supabase" as const };
  },
  ["home-categories"],
  { revalidate: 60, tags: ["categories"] },
);

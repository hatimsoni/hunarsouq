import "server-only";
import { createClient } from "@supabase/supabase-js";
import { unstable_cache } from "next/cache";
import { categories } from "./categories";
import { getSupabaseEnv } from "./supabase/env";
import type { Database } from "./supabase/database.types";
import { homeSnapshotSchema, type RecentMember } from "./home-schema";

const fallback = {
  categories,
  verifiedMembers: null as number | null,
  verifiedBusinesses: null as number | null,
  verifiedCourses: null as number | null,
  memberCounts: {} as Record<string, number>,
  recentMembers: [] as RecentMember[],
};
export const getHomeData = unstable_cache(
  async () => {
    const env = getSupabaseEnv();
    if (!env) return { ...fallback, source: "preview" as const };
    const supabase = createClient<Database>(env.url, env.key, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    try {
      const { data, error } = await supabase
        .rpc("public_home_snapshot")
        .abortSignal(AbortSignal.timeout(8000));
      const parsed = homeSnapshotSchema.safeParse(data);
      if (error || !parsed.success)
        return { ...fallback, source: "unavailable" as const };
      return {
        categories: parsed.data.categories,
        verifiedMembers: parsed.data.verified_members,
        verifiedBusinesses: parsed.data.verified_businesses,
        verifiedCourses: parsed.data.verified_courses,
        memberCounts: Object.fromEntries(
          parsed.data.categories.map((category) => [
            category.id,
            category.member_count,
          ]),
        ),
        recentMembers: parsed.data.recent_members,
        source: "supabase" as const,
      };
    } catch {
      return { ...fallback, source: "unavailable" as const };
    }
  },
  ["home-snapshot-v4"],
  { revalidate: 60, tags: ["home", "categories"] },
);

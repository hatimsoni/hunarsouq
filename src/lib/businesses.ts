import "server-only";
import { cache } from "react";
import { publicClient } from "./directory";
import { requireUser } from "./auth";
import type { PublicBusiness, Business } from "./supabase/database.types";
import type { businessFilters } from "./business-validation";
export async function getOwnItems() {
  const { supabase, user } = await requireUser();
  const [businesses, experiences] = await Promise.all([
    supabase
      .from("businesses")
      .select("*")
      .eq("owner_id", user.id)
      .order("created_at"),
    supabase
      .from("work_experiences")
      .select("*")
      .eq("profile_id", user.id)
      .order("start_date", { ascending: false })
      .order("id"),
  ]);
  if (businesses.error || experiences.error)
    throw new Error(
      "Your businesses and work experience could not be loaded. Check the Phase 5 migration.",
    );
  return {
    businesses: businesses.data ?? [],
    experiences: experiences.data ?? [],
  };
}
export async function businessPreviews(business: Business) {
  const paths = [...(business.logo ? [business.logo] : []), ...business.photos];
  if (!paths.length) return {};
  const { supabase } = await requireUser();
  const { data } = await supabase.storage
    .from("business-media")
    .createSignedUrls(paths, 900);
  return Object.fromEntries(
    (data ?? [])
      .filter((p) => p.path && p.signedUrl)
      .map((p) => [p.path!, p.signedUrl!]),
  );
}
export const getPublicBusiness = cache(async (slug: string) => {
  if (!/^[a-z][a-z0-9-]{2,79}$/.test(slug)) return null;
  const db = publicClient();
  if (!db) return null;
  const { data, error } = await db
    .from("public_businesses")
    .select("*")
    .eq("slug", slug)
    .maybeSingle();
  if (error) throw new Error("This business could not be loaded.");
  return data;
});
export async function getBusinessDirectory(
  filters: ReturnType<typeof businessFilters>,
) {
  const db = publicClient();
  if (!db)
    return {
      total: 0,
      businesses: [] as PublicBusiness[],
      cities: [] as string[],
      unavailable: true,
    };
  const { data, error } = await db.rpc("search_businesses", {
    keyword: filters.q,
    type_filter: filters.type,
    city_filter: filters.city,
    page_number: filters.page,
  });
  if (error || !data)
    throw new Error("The business directory could not be loaded.");
  return {
    ...(data as {
      total: number;
      businesses: PublicBusiness[];
      cities: string[];
    }),
    unavailable: false,
  };
}
export async function getProfileWork(id: string) {
  const db = publicClient();
  if (!db) return { businesses: [], experiences: [] };
  const [businesses, experiences] = await Promise.all([
    db
      .from("public_businesses")
      .select("*")
      .eq("owner_id", id)
      .order("created_at"),
    db
      .from("public_work_experiences")
      .select("*")
      .eq("profile_id", id)
      .order("start_date", { ascending: false })
      .order("id"),
  ]);
  if (businesses.error || experiences.error)
    throw new Error("This member’s work could not be loaded.");
  return {
    businesses: businesses.data ?? [],
    experiences: experiences.data ?? [],
  };
}

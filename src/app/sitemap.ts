import type { MetadataRoute } from "next";
import { publicClient } from "@/lib/directory";
import { getHomeData } from "@/lib/home";
export const dynamic = "force-dynamic";
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const origin = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const { categories } = await getHomeData();
  const entries: MetadataRoute.Sitemap = [
    "",
    "/about",
    "/hunar",
    "/business",
    "/courses",
    ...categories.map((c) => `/hunar?skill=${encodeURIComponent(c.slug)}`),
  ].map((path) => ({ url: `${origin.replace(/\/$/, "")}${path}` }));
  const db = publicClient();
  if (db)
    for (let offset = 0; offset < 49000; offset += 1000) {
      const { data, error } = await db
        .from("public_profiles")
        .select("username,approved_at")
        .order("id")
        .range(offset, offset + 999);
      if (error)
        throw new Error("Could not generate the public profile sitemap.");
      for (const p of data ?? [])
        if (p.username)
          entries.push({
            url: `${origin.replace(/\/$/, "")}/${p.username}`,
            ...(p.approved_at ? { lastModified: p.approved_at } : {}),
          });
      if (!data || data.length < 1000) break;
    }
  if (db)
    for (let offset = 0; offset < 49000; offset += 1000) {
      const { data, error } = await db
        .from("public_businesses")
        .select("slug,approved_at")
        .order("id")
        .range(offset, offset + 999);
      if (error)
        throw new Error("Could not generate the public business sitemap.");
      for (const business of data ?? [])
        entries.push({
          url: `${origin.replace(/\/$/, "")}/business/${business.slug}`,
          ...(business.approved_at
            ? { lastModified: business.approved_at }
            : {}),
        });
      if (!data || data.length < 1000) break;
    }
  if (db)
    for (let offset = 0; offset < 49000; offset += 1000) {
      const { data, error } = await db
        .from("public_courses")
        .select("slug,updated_at")
        .order("id")
        .range(offset, offset + 999);
      if (error) throw new Error("Could not generate the public course sitemap.");
      for (const course of data ?? [])
        entries.push({
          url: `${origin.replace(/\/$/, "")}/courses/${course.slug}`,
          lastModified: course.updated_at,
        });
      if (!data || data.length < 1000) break;
    }
  return entries;
}

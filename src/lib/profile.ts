import "server-only";
import { cache } from "react";
import { requireUser } from "./auth";
import { emptyProfile, type ProfileInput } from "./validation";
import type { Profile } from "./supabase/database.types";
export const getOwnProfile = cache(async () => {
  const { supabase, user } = await requireUser();
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();
  if (error || !data) {
    // PostgREST returns PGRST205 when the profiles table is missing from the
    // schema cache. Make the initial project setup issue actionable in the UI.
    if (error?.code === "PGRST205" || error?.code === "42P01") {
      throw new Error(
        "Your account database is not set up yet. Apply the SQL migrations in supabase/migrations, then try again.",
      );
    }
    throw new Error(
      "Your profile could not be loaded. Check the Phase 2 migration and try again.",
    );
  }
  return data;
});
export function profileToInput(profile: Profile): ProfileInput {
  return {
    full_name: profile.full_name,
    username: profile.username ?? "",
    photo_url: profile.photo_url ?? "",
    category_id: profile.category_id ?? "",
    sub_skills: profile.sub_skills.join(", "),
    bio: profile.bio,
    city: profile.city,
    state: profile.state,
    country: profile.country || "India",
    years_experience: profile.years_experience,
    availability: profile.availability,
    phone: profile.phone,
    whatsapp: profile.whatsapp,
    email_public: profile.email_public,
    show_call: profile.show_call,
    show_email: profile.show_email,
    links: { ...emptyProfile.links, ...profile.links },
    portfolio_images: profile.portfolio_images,
  };
}
export async function mediaPreviews(
  profile: Profile,
): Promise<Record<string, string>> {
  const paths = [
    ...profile.portfolio_images,
    ...(profile.photo_url ? [profile.photo_url] : []),
  ];
  if (!paths.length) return {};
  const { supabase } = await requireUser();
  const { data } = await supabase.storage
    .from("profile-media")
    .createSignedUrls(paths, 3600);
  return Object.fromEntries(
    (data ?? [])
      .filter((item) => item.path && item.signedUrl)
      .map((item) => [item.path!, item.signedUrl!]),
  );
}

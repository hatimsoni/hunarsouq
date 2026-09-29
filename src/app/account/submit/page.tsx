import { getOwnProfile, profileToInput, mediaPreviews } from "@/lib/profile";
import { requireUser } from "@/lib/auth";
import { ProfileWizard } from "@/components/profile-wizard";
import { redirect } from "next/navigation";
export const metadata = { title: "Your Hunar profile" };
export default async function SubmitProfile() {
  const profile = await getOwnProfile();
  if (profile.status === "suspended") redirect("/account");
  const { supabase } = await requireUser();
  const [{ data: categories, error }, previews] = await Promise.all([
    supabase.from("categories").select("*").order("sort_order"),
    mediaPreviews(profile),
  ]);
  if (error || !categories?.length)
    throw new Error("Skill categories could not be loaded. Please try again.");
  return (
    <ProfileWizard
      initial={profileToInput(profile)}
      revision={profile.updated_at}
      status={profile.status}
      categories={categories}
      previews={previews}
    />
  );
}

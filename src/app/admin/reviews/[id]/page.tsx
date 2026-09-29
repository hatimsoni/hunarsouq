import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";
import { UserRound, ArrowLeft, ExternalLink } from "lucide-react";
import { requireAdmin } from "@/lib/admin";
import { safeExternalLink, verificationWhatsApp } from "@/lib/admin-validation";
import { ReviewForm } from "@/components/admin/review-form";
import { Badge } from "@/components/ui/badge";
import { VerifiedBadge } from "@/components/verified-badge";
import { InstructorAccess } from "@/components/admin/instructor-access";
export const metadata = { title: "Review a member" };
export default async function Review({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  if (!z.string().uuid().safeParse(id).success) notFound();
  const { supabase, user } = await requireAdmin();
  const { data: profile, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error("Submission could not be loaded.");
  if (!profile) notFound();
  const paths = [
    ...profile.portfolio_images,
    ...(profile.photo_url ? [profile.photo_url] : []),
  ];
  const [images, history, category] = await Promise.all([
    paths.length
      ? supabase.storage.from("profile-media").createSignedUrls(paths, 900)
      : Promise.resolve({ data: [], error: null }),
    supabase
      .from("verification_logs")
      .select("*")
      .eq("profile_id", id)
      .order("created_at", { ascending: false })
      .limit(50),
    profile.category_id
      ? supabase
          .from("categories")
          .select("name")
          .eq("id", profile.category_id)
          .maybeSingle()
      : Promise.resolve({ data: null, error: null }),
  ]);
  if (history.error || category.error)
    throw new Error("Review history could not be loaded.");
  const previews = Object.fromEntries(
    (images.data ?? [])
      .filter((image) => image.path && image.signedUrl)
      .map((image) => [image.path!, image.signedUrl!]),
  );
  const reviewerIds = [
    ...new Set(
      (history.data ?? [])
        .map((log) => log.reviewer_id)
        .filter((value): value is string => !!value),
    ),
  ];
  const reviewers = reviewerIds.length
    ? await supabase
        .from("profiles")
        .select("id,full_name")
        .in("id", reviewerIds)
    : { data: [] };
  const reviewerNames = new Map(
    (reviewers.data ?? []).map((reviewer) => [reviewer.id, reviewer.full_name]),
  );
  const whatsapp = verificationWhatsApp(profile.whatsapp, profile.full_name);
  return (
    <>
      <Link
        href="/admin/reviews"
        className="mb-6 inline-flex min-h-11 items-center gap-2 text-sm"
      >
        <ArrowLeft size={16} />
        Back to review queue
      </Link>
      <div className="grid items-start gap-7 lg:grid-cols-[1fr_340px]">
        <div className="min-w-0 space-y-6">
          <section className="rounded-xl border bg-background p-6">
            <div className="flex flex-wrap items-center gap-5">
              <div className="flex size-20 items-center justify-center overflow-hidden rounded-full bg-secondary">
                {profile.photo_url && previews[profile.photo_url] ? (
                  <Image
                    src={previews[profile.photo_url]}
                    width={80}
                    height={80}
                    unoptimized
                    alt={`${profile.full_name}'s submitted photo`}
                    className="size-20 object-cover"
                  />
                ) : (
                  <UserRound size={30} />
                )}
              </div>
              <div>
                <h1 className="text-3xl">
                  {profile.full_name || "Unnamed member"}
                </h1>
                <p className="mt-2 text-sm text-muted-foreground">
                  {profile.username ? `@${profile.username}` : "No username"} ·{" "}
                  {profile.role}
                </p>
                <div className="mt-3 flex gap-2">
                  <Badge variant="secondary" className="capitalize">
                    {profile.status.replaceAll("_", " ")}
                  </Badge>
                  {profile.is_verified && <VerifiedBadge />}
                </div>
              </div>
            </div>
            <dl className="mt-7 grid gap-5 text-sm sm:grid-cols-2">
              {[
                ["Category", category.data?.name || "Not selected"],
                ["Experience", `${profile.years_experience} years`],
                [
                  "Location",
                  [profile.city, profile.state, profile.country]
                    .filter(Boolean)
                    .join(", ") || "Not provided",
                ],
                ["Availability", profile.availability.replaceAll("_", " ")],
                ["Joined", new Date(profile.created_at).toISOString()],
                ["Last edited", new Date(profile.updated_at).toISOString()],
                [
                  "Approved at",
                  profile.approved_at
                    ? new Date(profile.approved_at).toISOString()
                    : "Not approved",
                ],
              ].map(([label, value]) => (
                <div key={label}>
                  <dt className="font-medium">{label}</dt>
                  <dd className="mt-1 break-words leading-6 text-muted-foreground">
                    {value}
                  </dd>
                </div>
              ))}
            </dl>
            <h2 className="mb-2 mt-7 text-xl">About their work</h2>
            <p className="whitespace-pre-wrap break-words text-sm leading-7 text-muted-foreground">
              {profile.bio || "No biography yet."}
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              {profile.sub_skills.map((skill, index) => (
                <Badge key={index} variant="outline">
                  {skill}
                </Badge>
              ))}
            </div>
          </section>
          <section className="rounded-xl border bg-background p-6">
            <h2 className="text-xl">Contact settings</h2>
            <p className="mt-2 text-xs leading-6 text-muted-foreground">
              Private review details. These numbers and addresses are not
              included in public profile data.
            </p>
            <dl className="mt-5 space-y-4 text-sm">
              {[
                ["Phone", profile.phone || "Not provided"],
                ["Call button", profile.show_call ? "Enabled" : "Disabled"],
                ["WhatsApp", profile.whatsapp || "Not provided"],
                ["Contact email", profile.email_public || "Not provided"],
                ["Email button", profile.show_email ? "Enabled" : "Disabled"],
              ].map(([label, value]) => (
                <div key={label}>
                  <dt className="font-medium">{label}</dt>
                  <dd className="mt-1 break-all text-muted-foreground">
                    {value}
                  </dd>
                </div>
              ))}
            </dl>
            {whatsapp && (
              <a
                href={whatsapp}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-lg border px-4 text-sm"
              >
                Open WhatsApp
                <ExternalLink size={14} />
              </a>
            )}
          </section>
          <section className="rounded-xl border bg-background p-6">
            <h2 className="text-xl">Links & portfolio</h2>
            <div className="my-4 flex flex-wrap gap-3">
              {Object.entries(profile.links).map(([label, value]) => {
                const href = safeExternalLink(value);
                return href ? (
                  <a
                    key={label}
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex min-h-11 items-center gap-2 text-sm capitalize underline underline-offset-4"
                  >
                    {label}
                    <ExternalLink size={13} />
                  </a>
                ) : null;
              })}
            </div>
            {images.error && (
              <p role="status" className="mb-4 text-sm text-destructive">
                Image previews could not be loaded. Reload before completing
                your review.
              </p>
            )}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {profile.portfolio_images.map((path, index) => (
                <div
                  key={`${path}-${index}`}
                  className="relative aspect-square overflow-hidden rounded-lg border bg-secondary"
                >
                  {previews[path] ? (
                    <a
                      href={previews[path]}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <Image
                        src={previews[path]}
                        fill
                        unoptimized
                        alt={`Submitted portfolio image ${index + 1}; open full image`}
                        className="object-cover"
                      />
                    </a>
                  ) : (
                    <p className="p-4 text-xs">Image unavailable</p>
                  )}
                </div>
              ))}
            </div>
            {!profile.portfolio_images.length && (
              <p className="text-sm text-muted-foreground">
                No portfolio images submitted.
              </p>
            )}
          </section>
          <section className="rounded-xl border bg-background p-6">
            <h2 className="mb-5 text-xl">Verification history</h2>
            {!history.data?.length && (
              <p className="text-sm text-muted-foreground">
                No review decisions yet.
              </p>
            )}
            <ol className="space-y-5">
              {history.data?.map((log) => (
                <li key={log.id} className="border-b pb-5 last:border-0">
                  <p className="text-sm font-medium capitalize">
                    {log.action.replaceAll("_", " ")} ·{" "}
                    {log.from_status.replaceAll("_", " ")} →{" "}
                    {log.to_status.replaceAll("_", " ")}
                  </p>
                  <p className="mt-2 break-all text-xs leading-6 text-muted-foreground">
                    {log.reviewer_id
                      ? reviewerNames.get(log.reviewer_id) || log.reviewer_id
                      : "Deleted administrator"}{" "}
                    · {new Date(log.created_at).toISOString()}
                  </p>
                  {log.note && (
                    <p className="mt-2 whitespace-pre-wrap text-sm leading-7">
                      {log.note}
                    </p>
                  )}
                </li>
              ))}
            </ol>
            {history.data?.length === 50 && (
              <p className="text-xs text-muted-foreground">
                Showing the latest 50 decisions.
              </p>
            )}
          </section>
        </div>
        <aside className="space-y-5">
          <InstructorAccess
            userId={profile.id}
            enabled={profile.role === "instructor"}
            eligible={profile.status === "approved" && profile.is_verified}
            ownProfile={user.id === id}
          />
          {profile.rejection_note && (
            <section className="rounded-xl border border-[#e4ce98] bg-[#fbf2df] p-5">
              <h2 className="text-lg">Current review note</h2>
              <p className="mt-3 whitespace-pre-wrap text-sm leading-7">
                {profile.rejection_note}
              </p>
            </section>
          )}
          <ReviewForm
            profile={{
              id: profile.id,
              status: profile.status,
              role: profile.role,
              updated_at: profile.updated_at,
            }}
            ownProfile={user.id === id}
          />
        </aside>
      </div>
    </>
  );
}

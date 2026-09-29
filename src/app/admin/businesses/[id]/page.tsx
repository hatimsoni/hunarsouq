import { notFound } from "next/navigation";
import { z } from "zod";
import { requireAdmin } from "@/lib/admin";
import { BusinessReview } from "@/components/admin/business-review";
import { businessPreviews } from "@/lib/businesses";
import { businessTypes } from "@/lib/business-validation";
import type { Business } from "@/lib/supabase/database.types";
import Image from "next/image";
export default async function InspectBusiness({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  if (!z.string().uuid().safeParse(id).success) notFound();
  const { supabase, user } = await requireAdmin();
  const { data: b, error } = await supabase
    .from("businesses")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error("Business details could not be loaded.");
  if (!b) notFound();
  const [{ data: owner }, { data: logs }] = await Promise.all([
    supabase
      .from("profiles")
      .select("full_name,username,city,status,role")
      .eq("id", b.owner_id)
      .maybeSingle(),
    supabase
      .from("business_verification_logs")
      .select("*")
      .eq("business_id", id)
      .order("created_at", { ascending: false })
      .limit(50),
  ]);
  const previews = await businessPreviews(b as Business);
  const external = (label: string, value: string) => (
    <p className="mt-2 break-all">
      <span className="font-medium">{label}: </span>
      {value || "Not provided"}
    </p>
  );
  return (
    <>
      <p className="eyebrow">Business review</p>
      <h1 className="mt-2 text-4xl">{b.name}</h1>
      <p className="mt-3 text-muted-foreground">
        {businessTypes[b.type]} · {b.status.replaceAll("_", " ")}
      </p>
      <div className="my-6 grid gap-7 xl:grid-cols-2">
        <section className="space-y-5 rounded-xl border bg-white p-6">
          <h2 className="text-2xl">Listing details</h2>
          <p className="whitespace-pre-wrap break-words leading-7">
            {b.description || "No description yet."}
          </p>
          {external("City", b.city)}
          {external("Address", b.address)}
          {external("Private business phone", b.phone)}
          {external("Private WhatsApp", b.whatsapp)}
          {external("Private email", b.email)}
          {external("Website", b.website)}
          {external("Instagram", b.instagram)}
          {b.logo && previews[b.logo] && (
            <div>
              <h3 className="mb-2">Logo</h3>
              <Image
                unoptimized
                width={160}
                height={160}
                src={previews[b.logo]}
                alt={`${b.name} logo`}
                className="size-40 rounded-xl object-cover"
              />
            </div>
          )}
          <div className="flex flex-wrap gap-3">
            {b.photos.map(
              (p: string, i: number) =>
                previews[p] && (
                  <Image
                    key={p}
                    unoptimized
                    width={160}
                    height={160}
                    src={previews[p]}
                    alt={`${b.name} photo ${i + 1}`}
                    className="size-40 rounded-xl object-cover"
                  />
                ),
            )}
          </div>
        </section>
        <div className="space-y-6">
          <section className="rounded-xl border bg-white p-6">
            <h2 className="text-2xl">Owner profile</h2>
            {owner ? (
              <>
                <p className="mt-3">
                  {owner.full_name} · {owner.city} · {owner.status}
                </p>
                {owner.username && (
                  <a
                    className="mt-3 inline-flex min-h-11 items-center underline"
                    href={`/${owner.username}`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Inspect public profile ↗
                  </a>
                )}
              </>
            ) : (
              <p>Owner was removed.</p>
            )}
          </section>
          <BusinessReview
            id={b.id}
            ownerId={b.owner_id}
            reviewerId={user.id}
            revision={b.updated_at}
            status={b.status}
          />
          <section className="rounded-xl border bg-white p-6">
            <h2 className="text-2xl">Business review history</h2>
            {!logs?.length ? (
              <p className="mt-3">No decisions yet.</p>
            ) : (
              <ol className="mt-4 space-y-3">
                {logs.map((log) => (
                  <li key={log.id} className="border-t pt-3">
                    <p className="font-medium">
                      {log.action.replaceAll("_", " ")} · {log.from_status} →{" "}
                      {log.to_status}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {new Date(log.created_at).toLocaleString("en-GB", {
                        timeZone: "UTC",
                      })}{" "}
                      UTC ·{" "}
                      {log.reviewer_id === user.id ? "You" : "Administrator"}
                    </p>
                    {log.note && (
                      <p className="mt-2 whitespace-pre-wrap text-sm">
                        {log.note}
                      </p>
                    )}
                  </li>
                ))}
              </ol>
            )}
          </section>
        </div>
      </div>
    </>
  );
}

import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { z } from "zod";
import { getOwnProfile } from "@/lib/profile";
import { getOwnItems, businessPreviews } from "@/lib/businesses";
import { BusinessEditor } from "@/components/business-editor";
export default async function EditBusiness({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const profile = await getOwnProfile();
  if (profile.status === "suspended") redirect("/account");
  if (id !== "new" && !z.string().uuid().safeParse(id).success) notFound();
  const { businesses, experiences } = await getOwnItems();
  if (id === "new")
    return businesses.length + experiences.length >= 5 ? (
      <div>
        <h1 className="text-3xl">All five spaces are used.</h1>
        <p className="my-4">
          Remove a business or work entry before adding another.
        </p>
        <Link href="/account" className="underline">
          Back to your account
        </Link>
      </div>
    ) : (
      <BusinessEditor business={null} />
    );
  const business = businesses.find((b) => b.id === id);
  if (!business) notFound();
  if (business.status === "suspended") redirect("/account");
  return (
    <BusinessEditor
      business={business}
      previews={await businessPreviews(business)}
    />
  );
}

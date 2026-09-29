import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getPublicBusiness } from "@/lib/businesses";
import { PublicBusinessDetail } from "@/components/public-business-detail";
export const dynamic = "force-dynamic";
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const business = await getPublicBusiness((await params).slug);
  if (!business)
    return {
      title: "Business not found",
      robots: { index: false, follow: false },
    };
  const title = `${business.name} — ${business.city}`;
  const description = business.description.slice(0, 160);
  return {
    title,
    description,
    alternates: { canonical: `/business/${business.slug}` },
    openGraph: {
      title,
      description,
      images: [`/og?business=${business.slug}`],
    },
    twitter: { card: "summary_large_image" },
  };
}
export default async function BusinessPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const business = await getPublicBusiness((await params).slug);
  if (!business) notFound();
  return <PublicBusinessDetail business={business} />;
}

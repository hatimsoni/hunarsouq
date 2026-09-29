import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Sprout } from "lucide-react";
import { Container, Section } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { getPublicProfile } from "@/lib/directory";
import { PublicProfile } from "@/components/public-profile";
import { getPublicBusiness } from "@/lib/businesses";
import { PublicBusinessDetail } from "@/components/public-business-detail";
export const dynamic = "force-dynamic";

const pages: Record<
  string,
  {
    title: string;
    intro: string;
    sections: [string, string][];
    preview?: boolean;
  }
> = {
  about: {
    title: "Every skill has a story.",
    intro: "We’re making a place where those stories can find their people.",
    sections: [
      [
        "Our community",
        "Hunar Souq brings skilled individuals, independent businesses, and learners together. From a carefully stitched garment to thoughtful professional advice, we believe good work deserves to be seen.",
      ],
      [
        "Our promise",
        "Human review, free profiles, and considered privacy are the starting points for our community. We’re building one step at a time, with care for the people behind the work.",
      ],
    ],
  },
  privacy: {
    title: "Your details. Your choice.",
    intro:
      "Draft privacy information — the full policy will be published before accounts open.",
    preview: true,
    sections: [
      [
        "What this preview collects",
        "When account services are configured, we store your email and authentication details with Supabase, along with the profile information and images you choose to submit. Draft and pending profiles are private. Paid course checkout is processed by Razorpay when payment credentials are configured. Hosting providers may process standard request logs.",
      ],
      [
        "Our planned approach",
        "You will choose the contact options on your profile. Phone numbers will not be rendered as plain text in public pages. The complete policy will explain account data, retention, service providers, and access and deletion requests before launch.",
      ],
    ],
  },
  terms: {
    title: "A fair place to connect.",
    intro:
      "Draft terms — final terms will be available before the marketplace opens.",
    preview: true,
    sections: [
      [
        "This preview",
        "Hunar Souq is being built in stages. Profiles, business listings, and community courses are reviewed before publication. Paid courses use Razorpay checkout when configured; enrollment is confirmed by a verified payment notification.",
      ],
      [
        "Community expectations",
        "Members will be expected to provide accurate information, respect others’ work, and communicate honestly. Verification will indicate community review; it will not guarantee service quality or replace professional licensing checks.",
      ],
    ],
  },
  guidelines: {
    title: "Good work starts with respect.",
    intro: "A few shared principles for a community we can all be proud of.",
    preview: true,
    sections: [
      [
        "Be yourself",
        "Use accurate information about your identity, skills, experience, and qualifications. Share work you created or have permission to show.",
      ],
      [
        "Be considerate",
        "Treat everyone with dignity. Respect boundaries, personal details, and the contact preferences people choose.",
      ],
      [
        "Build trust",
        "Be clear about availability, costs, and what you can deliver. Public profiles are reviewed before publication. Use Report this profile on a member page to flag a concern for the review team.",
      ],
    ],
  },
  contact: {
    title: "Let’s keep in touch.",
    intro: "We’re preparing our community support channels.",
    preview: true,
    sections: [
      [
        "Support is coming soon",
        "A verified support address and contact options will be published here before registration opens. This preview does not collect messages.",
      ],
      [
        "In the meantime",
        "Explore our community guidelines and the answers on the homepage to learn how Hunar Souq will work.",
      ],
    ],
  },
  courses: {
    title: "Make room for a new skill.",
    intro: "Make room for a new skill.",
    preview: true,
    sections: [
      [
        "Learn from people who do",
        "Our course collection will bring together approved instructors and practical lessons, with clear information about level, language, and price.",
      ],
    ],
  },
};
export async function generateMetadata({
  params,
}: {
  params: Promise<{ page: string }>;
}): Promise<Metadata> {
  const key = (await params).page;
  const entry = Object.hasOwn(pages, key) ? pages[key] : undefined;
  if (!entry) {
    const profile = await getPublicProfile(key);
    if (!profile) {
      const business = await getPublicBusiness(key);
      if (!business)
        return {
          title: "Listing not found",
          robots: { index: false, follow: false },
        };
      const title = `${business.name} — ${business.city}`;
      return {
        title,
        description: business.description.slice(0, 160),
        alternates: { canonical: `/business/${business.slug}` },
        openGraph: {
          title,
          description: business.description.slice(0, 160),
          images: [`/og?business=${business.slug}`],
        },
        twitter: { card: "summary_large_image" },
      };
    }
    const title = `${profile.full_name} — ${profile.city}`;
    return {
      title,
      description: profile.bio.slice(0, 160),
      alternates: { canonical: `/${profile.username}` },
      openGraph: {
        title,
        description: profile.bio.slice(0, 160),
        images: [`/og?username=${profile.username}`],
      },
      twitter: { card: "summary_large_image" },
    };
  }
  return {
    title: entry?.title || "Page not found",
    description: entry?.intro,
    ...(entry?.preview ? { robots: { index: false, follow: true } } : {}),
  };
}
export default async function InformationPage({
  params,
}: {
  params: Promise<{ page: string }>;
}) {
  const key = (await params).page;
  const entry = Object.hasOwn(pages, key) ? pages[key] : undefined;
  if (!entry) {
    const profile = await getPublicProfile(key);
    if (profile) return <PublicProfile profile={profile} />;
    const business = await getPublicBusiness(key);
    if (!business) notFound();
    return <PublicBusinessDetail business={business} />;
  }
  return (
    <Section className="min-h-[65vh]">
      <Container className="max-w-3xl">
        <span className="mb-6 flex size-14 items-center justify-center rounded-full bg-secondary">
          <Sprout size={27} />
        </span>
        <p className="eyebrow mb-4">
          {entry.preview ? "Growing with care" : "The Hunar Souq story"}
        </p>
        <h1 className="font-display text-4xl leading-tight sm:text-5xl">
          {entry.title}
        </h1>
        <p className="mt-5 text-lg leading-8 text-muted-foreground">
          {entry.intro}
        </p>
        <div className="my-10 space-y-8">
          {entry.sections.map(([title, copy]) => (
            <section key={title}>
              <h2 className="text-2xl">{title}</h2>
              <p className="mt-3 leading-7 text-muted-foreground">{copy}</p>
            </section>
          ))}
        </div>
        <Button asChild variant="outline" className="h-11">
          <Link href="/">
            <ArrowLeft />
            Back to the community
          </Link>
        </Button>
      </Container>
    </Section>
  );
}

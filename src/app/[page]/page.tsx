import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Sprout } from "lucide-react";
import { Container, Section } from "@/components/layout";
import { Button } from "@/components/ui/button";

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
        "This foundation does not accept account registrations, contact submissions, or payments. No analytics have been added. Hosting providers may process standard request logs to operate the site.",
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
        "Hunar Souq is under construction. Registration, public listings, learning, and payments are not yet available. Content describes the planned community.",
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
        "Be clear about availability, costs, and what you can deliver. Profiles, businesses, and courses will be reviewed before publication. Reporting and moderation tools will arrive with public listings.",
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
  signup: {
    title: "Your hunar belongs here.",
    intro:
      "Registration is coming soon. We’re preparing a welcoming home for your skills.",
    preview: true,
    sections: [
      [
        "What comes next",
        "Create your account, share your work, and submit your profile for human review. Account creation will open in the next stage of the platform.",
      ],
    ],
  },
  login: {
    title: "A warm welcome awaits.",
    intro: "Member sign-in is coming soon.",
    preview: true,
    sections: [
      [
        "We’re getting ready",
        "Accounts are not open in this preview. Return to the homepage to discover what’s taking shape.",
      ],
    ],
  },
  hunar: {
    title: "Find your kind of talent.",
    intro: "The Hunar directory is coming soon.",
    preview: true,
    sections: [
      [
        "A community taking shape",
        "Our first reviewed profiles will appear here when the directory opens. In the meantime, explore the skill categories on our homepage.",
      ],
    ],
  },
  business: {
    title: "Small businesses. Big heart.",
    intro: "The business directory is coming soon.",
    preview: true,
    sections: [
      [
        "Made for local enterprise",
        "Discover community businesses once owner profiles and business listings have completed human review.",
      ],
    ],
  },
  courses: {
    title: "Make room for a new skill.",
    intro: "Community courses are coming soon.",
    preview: true,
    sections: [
      [
        "Learn from people who do",
        "Our course collection will bring together approved instructors and practical lessons, with clear information about level, language, and price.",
      ],
    ],
  },
};
export function generateStaticParams() {
  return Object.keys(pages).map((page) => ({ page }));
}
export async function generateMetadata({
  params,
}: {
  params: Promise<{ page: string }>;
}): Promise<Metadata> {
  const key = (await params).page;
  const entry = Object.hasOwn(pages, key) ? pages[key] : undefined;
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
  if (!entry) notFound();
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

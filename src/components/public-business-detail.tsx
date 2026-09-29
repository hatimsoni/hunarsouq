import Image from "next/image";
import Link from "next/link";
import { Container, Section } from "./layout";
import { VerifiedBadge } from "./verified-badge";
import { ContactButton, ShareProfile } from "./profile-interactions";
import { BusinessGallery } from "./business-gallery";
import { businessTypes } from "@/lib/business-validation";
import { safeExternalLink } from "@/lib/admin-validation";
import type { PublicBusiness } from "@/lib/supabase/database.types";
export function PublicBusinessDetail({
  business: b,
}: {
  business: PublicBusiness;
}) {
  const socials = [
    ["Website", b.website],
    ["Instagram", b.instagram],
  ]
    .map(([name, value]) => [name, safeExternalLink(value)] as const)
    .filter((entry): entry is readonly [string, string] => !!entry[1]);
  return (
    <Section>
      <Container className="max-w-5xl">
        <Link href="/business" className="text-sm underline">
          ← Explore local businesses
        </Link>
        <article className="mt-8 rounded-2xl border bg-white p-6 sm:p-10">
          <div className="flex flex-col items-start gap-6 sm:flex-row">
            {b.logo && (
              <Image
                src={`/media/business/${b.id}/logo`}
                alt={`${b.name} logo`}
                width={128}
                height={128}
                unoptimized
                className="size-32 rounded-xl object-cover"
              />
            )}
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-3">
                <VerifiedBadge />
                <span className="text-sm text-muted-foreground">
                  {businessTypes[b.type]}
                </span>
              </div>
              <h1 className="mt-3 break-words font-display text-4xl sm:text-5xl">
                {b.name}
              </h1>
              <p className="mt-3 text-muted-foreground">
                {[b.address, b.city].filter(Boolean).join(" · ")}
              </p>
              <p className="mt-4">
                Run by{" "}
                <Link className="underline" href={`/${b.owner_username}`}>
                  {b.owner_name}
                </Link>
              </p>
            </div>
          </div>
          <div className="mt-8 flex flex-wrap gap-3">
            <ContactButton id={b.id} name={b.name} resource="business" />
            <ShareProfile />
          </div>
          <p className="mt-8 max-w-3xl whitespace-pre-wrap break-words leading-8 text-muted-foreground">
            {b.description}
          </p>
          {b.photos.length > 0 && (
            <section className="mt-10">
              <h2 className="mb-5 text-3xl">Inside our business</h2>
              <BusinessGallery id={b.id} name={b.name} photos={b.photos} />
            </section>
          )}
          {socials.length > 0 && (
            <section className="mt-10">
              <h2 className="text-2xl">Find us online</h2>
              <ul className="mt-3 flex flex-wrap gap-5">
                {socials.map(([label, url]) => (
                  <li key={label}>
                    <a
                      className="inline-flex min-h-11 items-center underline"
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer ugc"
                    >
                      {label} ↗
                    </a>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </article>
      </Container>
    </Section>
  );
}

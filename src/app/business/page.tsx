import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Container, Section } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { inputClass } from "@/components/form-field";
import {
  businessFilters,
  businessHref,
  businessTypes,
} from "@/lib/business-validation";
import { getBusinessDirectory } from "@/lib/businesses";
import type { SearchParams } from "@/lib/directory-filters";
export const dynamic = "force-dynamic";
export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}): Promise<Metadata> {
  const f = businessFilters(await searchParams);
  const title = "Local businesses";
  return {
    title,
    description:
      "Explore community businesses that have passed owner and listing review.",
    alternates: { canonical: "/business" },
    robots: { index: !f.q && !f.city && !f.type && f.page === 1, follow: true },
    openGraph: { title, images: ["/og?businesses=1"] },
  };
}
export default async function BusinessDirectory({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const f = businessFilters(await searchParams);
  const data = await getBusinessDirectory(f);
  const pages = Math.ceil(data.total / 12);
  return (
    <Section className="min-h-[75vh]">
      <Container>
        <p className="eyebrow mb-4">Local enterprise</p>
        <h1 className="font-display text-4xl sm:text-5xl">
          Good work. Close to home.
        </h1>
        <p className="mt-4 max-w-2xl text-lg text-muted-foreground">
          Meet local shops, studios and independent businesses whose listing and
          owner profile have both been reviewed.
        </p>
        <form
          action="/business"
          className="my-9 grid gap-4 rounded-2xl border bg-white p-5 sm:grid-cols-3"
        >
          <label className="space-y-2 text-sm">
            Search businesses
            <input
              name="q"
              maxLength={100}
              defaultValue={f.q}
              className={inputClass}
              placeholder="Name or what they do"
            />
          </label>
          <label className="space-y-2 text-sm">
            Type
            <select
              aria-label="Business type"
              name="type"
              defaultValue={f.type}
              className={inputClass}
            >
              <option value="">All types</option>
              {Object.entries(businessTypes).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </select>
          </label>
          <label className="space-y-2 text-sm">
            City
            <input
              name="city"
              aria-label="Business city"
              list="business-cities"
              maxLength={100}
              defaultValue={f.city}
              className={inputClass}
              placeholder="Type a city"
            />
            <datalist id="business-cities">
              {data.cities.map((c) => (
                <option key={c} value={c} />
              ))}
            </datalist>
          </label>
          <div className="flex flex-wrap items-center gap-4 sm:col-span-3">
            <Button type="submit">Find a business</Button>
            <Link className="text-sm underline" href="/business">
              Clear filters
            </Link>
          </div>
        </form>
        {data.unavailable ? (
          <div className="rounded-xl border p-8">
            <h2 className="text-2xl">
              The business directory is getting ready.
            </h2>
            <p className="mt-3 text-muted-foreground">
              Listings appear after both business and owner profile approval.
            </p>
          </div>
        ) : (
          <>
            <p role="status" className="mb-5 text-sm text-muted-foreground">
              {data.total} {data.total === 1 ? "business" : "businesses"} found
            </p>
            {!data.businesses.length ? (
              <div className="rounded-xl border p-8">
                <h2 className="text-2xl">No businesses found.</h2>
                <p className="mt-3">
                  Try another city or broaden your filters.
                </p>
              </div>
            ) : (
              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {data.businesses.map((b) => (
                  <Link
                    key={b.id}
                    href={`/business/${b.slug}`}
                    className="group rounded-2xl border bg-white p-6 hover:border-primary hover:shadow-sm"
                  >
                    {b.logo ? (
                      <Image
                        src={`/media/business/${b.id}/logo`}
                        alt=""
                        width={72}
                        height={72}
                        unoptimized
                        className="mb-5 size-18 rounded-xl object-cover"
                      />
                    ) : (
                      <span
                        aria-hidden
                        className="mb-5 flex size-18 items-center justify-center rounded-xl bg-secondary text-2xl"
                      >
                        {b.name.charAt(0)}
                      </span>
                    )}
                    <h2 className="text-2xl group-hover:underline">{b.name}</h2>
                    <p className="mt-3">{businessTypes[b.type]}</p>
                    <p className="mt-2 text-sm text-muted-foreground">
                      {b.city}
                    </p>
                    <p className="mt-4 line-clamp-3 text-sm text-muted-foreground">
                      {b.description}
                    </p>
                    <p className="mt-4 text-sm">
                      Run by {b.owner_name} · Verified
                    </p>
                  </Link>
                ))}
              </div>
            )}
            {pages > 1 && (
              <nav
                aria-label="Business directory pages"
                className="mt-8 flex items-center gap-5"
              >
                {f.page > 1 && (
                  <Link
                    className="underline"
                    href={businessHref(f, f.page - 1)}
                  >
                    Previous
                  </Link>
                )}
                <span>
                  Page {f.page} of {pages}
                </span>
                {f.page < pages && (
                  <Link
                    className="underline"
                    href={businessHref(f, f.page + 1)}
                  >
                    Next
                  </Link>
                )}
              </nav>
            )}
          </>
        )}
      </Container>
    </Section>
  );
}

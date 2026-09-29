import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Container, Section } from "@/components/layout";
import { VerifiedBadge } from "@/components/verified-badge";
import { Button } from "@/components/ui/button";
import { inputClass } from "@/components/form-field";
import { getHomeData } from "@/lib/home";
import { getDirectory } from "@/lib/directory";
import { listPublicCourses } from "@/lib/courses";
import { CourseCard } from "@/components/course-card";
import {
  availabilityLabels,
  directoryFilters,
  directoryHref,
  type SearchParams,
} from "@/lib/directory-filters";
export const dynamic = "force-dynamic";
export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}): Promise<Metadata> {
  const f = directoryFilters(await searchParams);
  const { categories } = await getHomeData();
  const category = categories.find((c) => c.slug === f.skill);
  const title = category
    ? `${category.name} community`
    : "Find your kind of talent";
  const canonical = directoryHref(
    { ...f, q: "", city: "", availability: "", verified: false },
    1,
  );
  return {
    title,
    description:
      category?.description ??
      "Discover verified community talent by skill, city and availability.",
    alternates: { canonical },
    robots: {
      index: !f.q && !f.city && !f.availability && f.page === 1,
      follow: true,
    },
    openGraph: { title, images: [`/og?skill=${encodeURIComponent(f.skill)}`] },
  };
}
export default async function HunarDirectory({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const filters = directoryFilters(await searchParams);
  const [data, { categories }] = await Promise.all([
    getDirectory(filters),
    getHomeData(),
  ]);
  const pages = Math.ceil(data.total / 12);
  const selectedCategory = categories.find((category) => category.slug === filters.skill);
  const relatedCourses = selectedCategory
    ? await listPublicCourses({ category: selectedCategory.id })
    : [];
  return (
    <Section className="min-h-[75vh]">
      <Container>
        <p className="eyebrow mb-4">People with a hunar</p>
        <h1 className="font-display text-4xl sm:text-5xl">
          Find your kind of talent.
        </h1>
        <p className="mt-4 max-w-2xl text-lg text-muted-foreground">
          Good work starts with a connection. Discover the people making,
          creating and helping in your community.
        </p>
        <form
          action="/hunar"
          className="my-9 grid gap-4 rounded-2xl border bg-white p-5 md:grid-cols-2 lg:grid-cols-4"
        >
          <label className="space-y-2 text-sm">
            Search skills or people
            <input
              className={inputClass}
              name="q"
              maxLength={100}
              defaultValue={filters.q}
              placeholder="Name, skill or a little inspiration"
            />
          </label>
          <label className="space-y-2 text-sm">
            Skill category
            <select
              className={inputClass}
              aria-label="Skill category"
              name="skill"
              defaultValue={filters.skill}
            >
              <option value="">All skills</option>
              {categories.map((c) => (
                <option key={c.id} value={c.slug}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
          <label className="space-y-2 text-sm">
            City
            <input
              className={inputClass}
              name="city"
              list="directory-cities"
              maxLength={100}
              defaultValue={filters.city}
              placeholder="Type a city"
            />
            <datalist id="directory-cities">
              {data.cities.map((c) => (
                <option key={c} value={c} />
              ))}
            </datalist>
          </label>
          <label className="space-y-2 text-sm">
            Availability
            <select
              className={inputClass}
              aria-label="Availability"
              name="availability"
              defaultValue={filters.availability}
            >
              <option value="">Any availability</option>
              {Object.entries(availabilityLabels).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </select>
          </label>
          <div className="flex flex-wrap items-center gap-4 md:col-span-2 lg:col-span-4">
            <label className="flex min-h-11 items-center gap-2 text-sm">
              <input
                type="checkbox"
                name="verified"
                value="1"
                defaultChecked={filters.verified}
              />
              Verified only
            </label>
            <Button type="submit">Find talent</Button>
            <Link className="text-sm underline" href="/hunar">
              Clear filters
            </Link>
            <p className="text-xs text-muted-foreground">
              Every published profile has passed community review.
            </p>
          </div>
        </form>
        {data.unavailable ? (
          <div role="status" className="rounded-xl border p-8">
            <h2 className="text-2xl">The directory is getting ready.</h2>
            <p className="mt-3 text-muted-foreground">
              Public profiles will appear once community services are connected.
            </p>
          </div>
        ) : (
          <>
            <p role="status" className="mb-5 text-sm text-muted-foreground">
              {data.total} {data.total === 1 ? "person" : "people"} found
            </p>
            {data.members.length === 0 ? (
              <div className="rounded-xl border p-8">
                <h2 className="text-2xl">No profiles here yet.</h2>
                <p className="mt-3">
                  Try another city or broaden your filters.
                </p>
              </div>
            ) : (
              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {data.members.map((p) => (
                  <Link
                    key={p.id}
                    href={`/${p.username}`}
                    className="group rounded-2xl border bg-white p-6 transition hover:border-primary hover:shadow-sm"
                  >
                    {p.photo_url ? (
                      <Image
                        src={`/media/member-avatar/${p.id}`}
                        alt=""
                        width={80}
                        height={80}
                        unoptimized
                        className="mb-5 size-20 rounded-full object-cover"
                      />
                    ) : (
                      <div className="mb-5 flex size-20 items-center justify-center rounded-full bg-secondary text-3xl">
                        {p.full_name.charAt(0)}
                      </div>
                    )}
                    <h2 className="mb-2 text-2xl group-hover:underline">
                      {p.full_name}
                    </h2>
                    <VerifiedBadge />
                    <p className="mt-4 font-medium">{p.category_name}</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {p.city}
                    </p>
                    <p className="mt-5 inline-flex rounded-full bg-secondary px-3 py-1.5 text-sm text-primary">
                      {availabilityLabels[p.availability]}
                    </p>
                  </Link>
                ))}
              </div>
            )}
            {pages > 1 && (
              <nav
                aria-label="Directory pages"
                className="mt-8 flex items-center gap-5"
              >
                {filters.page > 1 && (
                  <Link
                    className="underline"
                    href={directoryHref(filters, filters.page - 1)}
                  >
                    Previous
                  </Link>
                )}
                <span>
                  Page {filters.page} of {pages}
                </span>
                {filters.page < pages && (
                  <Link
                    className="underline"
                    href={directoryHref(filters, filters.page + 1)}
                  >
                    Next
                  </Link>
                )}
              </nav>
            )}
            {selectedCategory && relatedCourses.length > 0 && (
              <section className="mt-14 border-t pt-10">
                <p className="eyebrow mb-3">Learn this hunar</p>
                <h2 className="mb-6 text-3xl">Courses in {selectedCategory.name}</h2>
                <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                  {relatedCourses.slice(0, 3).map((course) => (
                    <CourseCard key={course.id} course={course} category={selectedCategory.name} />
                  ))}
                </div>
              </section>
            )}
          </>
        )}
      </Container>
    </Section>
  );
}

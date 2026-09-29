import Image from "next/image";
import Link from "next/link";
import { Container, Section } from "./layout";
import { VerifiedBadge } from "./verified-badge";
import {
  ContactButton,
  Portfolio,
  ReportButton,
  ShareProfile,
} from "./profile-interactions";
import { availabilityLabels } from "@/lib/directory-filters";
import { safeExternalLink } from "@/lib/admin-validation";
import type { PublicProfile as Profile } from "@/lib/supabase/database.types";
import { getHomeData } from "@/lib/home";
import { getProfileWork } from "@/lib/businesses";
import { listPublicCourses } from "@/lib/courses";
export async function PublicProfile({ profile: p }: { profile: Profile }) {
  const [{ categories }, work, courses] = await Promise.all([
    getHomeData(),
    getProfileWork(p.id),
    listPublicCourses({ instructor: p.id }),
  ]);
  const category = categories.find((c) => c.id === p.category_id);
  return (
    <Section>
      <Container className="max-w-5xl">
        <Link href="/hunar" className="text-sm underline">
          ← Explore all talent
        </Link>
        <div className="mt-8 rounded-2xl border bg-white p-6 sm:p-10">
          <div className="flex flex-col items-start gap-7 sm:flex-row">
            {p.photo_url && (
              <Image
                src={`/media/member-avatar/${p.id}`}
                alt={`${p.full_name}'s profile photo`}
                width={160}
                height={160}
                unoptimized
                className="size-32 rounded-full object-cover sm:size-40"
              />
            )}
            <div className="min-w-0 flex-1">
              <VerifiedBadge />
              <h1 className="mt-3 break-words font-display text-4xl sm:text-5xl">
                {p.full_name}
              </h1>
              <p className="mt-3 text-lg">
                {category && (
                  <Link
                    className="underline"
                    href={`/hunar?skill=${category.slug}`}
                  >
                    {category.name}
                  </Link>
                )}
              </p>
              <p className="mt-2 text-muted-foreground">
                {[p.city, p.state, p.country].filter(Boolean).join(", ")}
              </p>
              <p className="mt-4 font-medium text-primary">
                {availabilityLabels[p.availability]}
              </p>
            </div>
          </div>
          <div className="mt-8 flex flex-wrap items-start gap-3">
            <ContactButton id={p.id} name={p.full_name} />
            <ShareProfile />
          </div>
        </div>
        <div className="mt-10 grid gap-10 lg:grid-cols-[2fr_1fr]">
          <div className="space-y-10">
            <section>
              <h2 className="text-3xl">A little about me</h2>
              <p className="mt-4 whitespace-pre-wrap break-words leading-8 text-muted-foreground">
                {p.bio}
              </p>
              <div className="mt-5 flex flex-wrap gap-2">
                {p.sub_skills.map((s) => (
                  <span
                    key={s}
                    className="rounded-full bg-secondary px-4 py-2 text-sm"
                  >
                    {s}
                  </span>
                ))}
              </div>
            </section>
            {p.portfolio_images.length > 0 && (
              <section>
                <h2 className="mb-5 text-3xl">A look at my work</h2>
                <Portfolio
                  id={p.id}
                  count={p.portfolio_images.length}
                  name={p.full_name}
                />
              </section>
            )}
            <section>
              <h2 className="text-3xl">Experience</h2>
              <p className="mt-4 text-muted-foreground">
                {p.years_experience === 0
                  ? "At the beginning of my journey."
                  : `${p.years_experience} ${p.years_experience === 1 ? "year" : "years"} of experience.`}
              </p>
              {work.experiences.length > 0 && (
                <ol className="mt-5 space-y-4">
                  {work.experiences.map((item) => (
                    <li
                      key={item.id}
                      className="border-l-2 border-primary/30 pl-4"
                    >
                      <h3 className="font-medium">
                        {item.title} · {item.organisation}
                      </h3>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {item.start_date} — {item.end_date ?? "Present"}
                      </p>
                      {item.description && (
                        <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-6">
                          {item.description}
                        </p>
                      )}
                    </li>
                  ))}
                </ol>
              )}
              {work.businesses.length > 0 && (
                <div className="mt-7">
                  <h3 className="text-xl">My businesses</h3>
                  <ul className="mt-3 space-y-2">
                    {work.businesses.map((b) => (
                      <li key={b.id}>
                        <Link
                          href={`/business/${b.slug}`}
                          className="underline"
                        >
                          {b.name}
                        </Link>{" "}
                        · {b.city}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </section>
          </div>
          <aside className="space-y-8">
            {Object.values(p.links).some(safeExternalLink) && (
              <section className="rounded-xl border p-5">
                <h2 className="text-2xl">Elsewhere online</h2>
                <ul className="mt-3 space-y-3">
                  {Object.entries(p.links).map(([label, value]) => {
                    const url = safeExternalLink(value);
                    return url ? (
                      <li key={label}>
                        <a
                          href={url}
                          target="_blank"
                          rel="noopener noreferrer ugc"
                          className="inline-flex min-h-11 items-center capitalize underline"
                        >
                          {label} ↗
                        </a>
                      </li>
                    ) : null;
                  })}
                </ul>
              </section>
            )}
            {courses.length > 0 && (
              <section className="rounded-xl bg-secondary p-5">
                <h2 className="text-2xl">Courses from {p.full_name}</h2>
                <ul className="mt-3 space-y-3">
                  {courses.slice(0, 5).map((course) => (
                    <li key={course.id}>
                      <Link href={`/courses/${course.slug}`} className="font-medium underline underline-offset-4">{course.title}</Link>
                      <p className="mt-1 text-xs text-muted-foreground">{course.price === 0 ? "Free" : `₹${course.price.toLocaleString("en-IN")}`} · {course.level}</p>
                    </li>
                  ))}
                </ul>
              </section>
            )}
            <ReportButton id={p.id} />
          </aside>
        </div>
      </Container>
    </Section>
  );
}

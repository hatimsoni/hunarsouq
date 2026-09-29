import Link from "next/link";
import { ArrowRight, CheckCheck, Users, Store, BookOpen } from "lucide-react";
import { requireAdmin } from "@/lib/admin";
import { Button } from "@/components/ui/button";
export default async function AdminDashboard() {
  const { supabase } = await requireAdmin();
  const [pending, approved, queued, courses] = await Promise.all([
    supabase
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .eq("status", "pending"),
    supabase
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .eq("status", "approved")
      .eq("is_verified", true),
    supabase
      .from("profile_status_emails")
      .select("id", { count: "exact", head: true })
      .is("sent_at", null),
    supabase.from("courses").select("id", { count: "exact", head: true }).eq("status", "pending"),
  ]);
  if (pending.error || approved.error || queued.error || courses.error)
    throw new Error(
      "Admin counts could not be loaded. Apply the Phase 3 migration.",
    );
  const cards = [
    {
      icon: Users,
      label: "Profiles to review",
      value: String(pending.count ?? 0),
      copy: "Ready for a human review.",
      href: "/admin/reviews",
    },
    {
      icon: CheckCheck,
      label: "Verified members",
      value: String(approved.count ?? 0),
      copy: "Approved and publicly visible.",
      href: "/admin/members?status=approved",
    },
    {
      icon: Store,
      label: "Pending businesses",
      value: "—",
      copy: "Open the business review queue.",
      href: "/admin/businesses?status=pending",
    },
    {
      icon: BookOpen,
      label: "Pending courses",
      value: String(courses.count ?? 0),
      copy: "Ready for instructor course review.",
      href: "/admin/courses",
    },
  ];
  return (
    <>
      <p className="eyebrow mb-3">Care makes a community</p>
      <h1 className="text-3xl sm:text-4xl">
        A little attention. A lot of trust.
      </h1>
      <p className="mb-9 mt-4 max-w-2xl text-sm leading-7 text-muted-foreground">
        Review the people behind the profiles. Check their work, ask for clarity
        where needed, and give good skills a place to belong.
      </p>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map(({ icon: Icon, label, value, copy, href }) => (
          <section key={label} className="rounded-xl border bg-background p-6">
            <Icon className="mb-5 size-6 text-primary" strokeWidth={1.4} />
            <p className="font-display text-4xl">{value}</p>
            <h2 className="mt-3 font-sans text-sm font-semibold">{label}</h2>
            <p className="mt-2 text-xs leading-6 text-muted-foreground">
              {copy}
            </p>
            {href && (
              <Link
                href={href}
                className="mt-3 inline-flex min-h-11 items-center gap-2 text-xs font-medium"
              >
                Open view
                <ArrowRight size={14} />
              </Link>
            )}
          </section>
        ))}
      </div>
      <div className="mt-8 flex flex-wrap items-center justify-between gap-5 rounded-xl border bg-background p-6">
        <div>
          <h2 className="text-xl">Keep members in the loop.</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            {queued.count ?? 0} status emails awaiting delivery or attention.
          </p>
        </div>
        <Button asChild variant="outline" className="h-11">
          <Link href="/admin/notifications">
            Check status emails
            <ArrowRight />
          </Link>
        </Button>
      </div>
    </>
  );
}

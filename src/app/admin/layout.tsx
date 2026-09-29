import Link from "next/link";
import { ShieldCheck } from "lucide-react";
import { requireAdmin } from "@/lib/admin";
import { Container, Section } from "@/components/layout";
export const dynamic = "force-dynamic";
export const metadata = {
  title: "Community administration",
  robots: { index: false, follow: false },
};
export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireAdmin();
  return (
    <Section className="min-h-[75vh] bg-[#f1f2ea]">
      <Container>
        <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <p className="eyebrow flex items-center gap-2">
            <ShieldCheck size={19} />
            Community administration
          </p>
          <Link
            href="/account"
            className="inline-flex min-h-11 items-center text-sm underline underline-offset-4"
          >
            My account
          </Link>
        </div>
        <nav
          aria-label="Administration"
          className="mb-9 flex gap-2 overflow-x-auto border-b pb-4"
        >
          {[
            ["Overview", "/admin"],
            ["Review queue", "/admin/reviews"],
            ["Businesses", "/admin/businesses"],
            ["Courses", "/admin/courses"],
            ["Members", "/admin/members"],
            ["Reports", "/admin/reports"],
            ["Categories", "/admin/categories"],
            ["Status emails", "/admin/notifications"],
          ].map(([label, href]) => (
            <Link
              key={href}
              href={href}
              className="inline-flex min-h-11 shrink-0 items-center rounded-lg border bg-background px-4 text-sm font-medium hover:bg-secondary"
            >
              {label}
            </Link>
          ))}
        </nav>
        {children}
      </Container>
    </Section>
  );
}

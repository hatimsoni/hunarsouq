import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { signOut } from "@/app/auth/actions";
import { Container, Section } from "@/components/layout";
import { Button } from "@/components/ui/button";
export const dynamic = "force-dynamic";
export const metadata = {
  title: "Your account",
  robots: { index: false, follow: false },
};
export default async function AccountLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireUser();
  return (
    <Section className="min-h-[65vh] bg-[#f3f3ec]">
      <Container>
        <div className="mb-9 flex items-center justify-between gap-4">
          <Link
            href="/account"
            className="eyebrow inline-flex min-h-11 items-center"
          >
            Your Hunar Souq
          </Link>
          <form action={signOut}>
            <Button variant="outline" type="submit" className="h-11">
              Sign out
            </Button>
          </form>
        </div>
        {children}
      </Container>
    </Section>
  );
}

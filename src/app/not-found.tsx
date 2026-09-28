import Link from "next/link";
import { Container, Section } from "@/components/layout";
import { Button } from "@/components/ui/button";
export default function NotFound() {
  return (
    <Section>
      <Container className="py-16 text-center">
        <p className="eyebrow">404 · A little off the path</p>
        <h1 className="my-5 text-4xl">This page hasn’t found its place.</h1>
        <p className="mb-8 text-muted-foreground">
          Let’s get you back to the community.
        </p>
        <Button asChild>
          <Link href="/">Go home</Link>
        </Button>
      </Container>
    </Section>
  );
}

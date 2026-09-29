"use client";
import { Button } from "@/components/ui/button";
import { Container, Section } from "@/components/layout";
export default function DirectoryError({ reset }: { reset: () => void }) {
  return (
    <Section>
      <Container>
        <h1 className="text-3xl">The directory is temporarily unavailable.</h1>
        <p className="my-5">Please try again in a moment.</p>
        <Button onClick={reset}>Try again</Button>
      </Container>
    </Section>
  );
}

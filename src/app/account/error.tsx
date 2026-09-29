"use client";
import { Button } from "@/components/ui/button";

export default function AccountError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div
      role="alert"
      className="mx-auto max-w-xl rounded-xl border bg-background p-8"
    >
      <h1 className="text-2xl">Your account is taking a moment.</h1>
      <p className="my-5 leading-7 text-muted-foreground">
        {error.message || "We couldn’t load your profile. Try again shortly."}
      </p>
      <Button onClick={reset}>Try again</Button>
    </div>
  );
}

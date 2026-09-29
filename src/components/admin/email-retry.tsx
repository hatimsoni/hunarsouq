"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { retryStatusEmails } from "@/app/admin/actions";
import { Button } from "@/components/ui/button";
export function EmailRetry({ configured }: { configured: boolean }) {
  const [message, setMessage] = useState("");
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  return (
    <div>
      <Button
        className="h-11"
        disabled={pending || !configured}
        onClick={() =>
          startTransition(async () => {
            try {
              const result = await retryStatusEmails();
              setMessage(result.message ?? result.error ?? "Please try again.");
              router.refresh();
            } catch {
              setMessage(
                "Delivery could not be confirmed. Refresh the queue before trying again.",
              );
            }
          })
        }
      >
        {pending ? "Checking delivery…" : "Retry queued emails"}
      </Button>
      {message && (
        <p role="status" className="mt-3 max-w-lg text-sm leading-6">
          {message}
        </p>
      )}
    </div>
  );
}

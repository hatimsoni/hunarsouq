"use client";
import { useState, useTransition } from "react";
import { Button } from "../ui/button";
import { reviewReport } from "@/app/admin/reports/actions";
export function ReportReview({ id }: { id: string }) {
  const [pending, start] = useTransition();
  const [message, setMessage] = useState("");
  const review = (decision: string) =>
    start(async () => {
      try {
        const result = await reviewReport(id, decision);
        setMessage(result.error ?? "Report updated.");
      } catch {
        setMessage("Could not update report. Please try again.");
      }
    });
  return (
    <div className="mt-4 flex flex-wrap items-center gap-3">
      <Button disabled={pending} onClick={() => review("resolved")}>
        Mark resolved
      </Button>
      <Button
        disabled={pending}
        variant="outline"
        onClick={() => review("dismissed")}
      >
        Dismiss
      </Button>
      <p role="status">{message}</p>
    </div>
  );
}

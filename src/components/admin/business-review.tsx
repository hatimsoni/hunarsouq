"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "../ui/button";
import { Field, inputClass } from "../form-field";
import { reviewBusiness } from "@/app/admin/actions";
import { reviewSchema } from "@/lib/admin-validation";
import { z } from "zod";
type ReviewInput = z.infer<typeof reviewSchema>;
export function BusinessReview({
  id,
  ownerId,
  reviewerId,
  revision,
  status,
}: {
  id: string;
  ownerId: string;
  reviewerId: string;
  revision: string;
  status: string;
}) {
  const router = useRouter();
  const [result, setResult] = useState<{ error?: string; message?: string }>(
    {},
  );
  const [pending, start] = useTransition();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ReviewInput>({
    resolver: zodResolver(reviewSchema),
    defaultValues: { profile_id: id, revision, note: "" },
  });
  if (ownerId === reviewerId)
    return (
      <p className="rounded border p-4">
        Another administrator must review your business.
      </p>
    );
  const decisions: [ReviewInput["decision"], string][] =
    status === "pending"
      ? [
          ["approve", "Approve and publish"],
          ["request_changes", "Request changes"],
          ["reject", "Reject listing"],
        ]
      : status === "suspended"
        ? [["restore", "Restore as draft"]]
        : [];
  if (status !== "suspended") decisions.push(["suspend", "Suspend business"]);
  return (
    <form
      className="space-y-4 rounded-xl border bg-white p-6"
      onSubmit={handleSubmit((v) =>
        start(async () => {
          try {
            const r = await reviewBusiness(v);
            setResult(r);
            if (!r.error) {
              router.refresh();
            }
          } catch {
            setResult({
              error:
                "Could not confirm this business review. Reload before acting.",
            });
          }
        }),
      )}
    >
      <h2 className="text-2xl">Business review</h2>
      <Field
        id="business-decision"
        label="Decision"
        error={errors.decision?.message}
      >
        <select
          id="business-decision"
          className={inputClass}
          disabled={pending}
          {...register("decision")}
        >
          <option value="">Choose a decision</option>
          {decisions.map(([key, label]) => (
            <option value={key} key={key}>
              {label}
            </option>
          ))}
        </select>
      </Field>
      <Field
        id="business-note"
        label="Reviewer note"
        hint="Required when returning, rejecting or suspending a listing."
        error={errors.note?.message}
      >
        <textarea
          id="business-note"
          rows={4}
          maxLength={2000}
          disabled={pending}
          className={inputClass}
          {...register("note")}
        />
      </Field>
      <Button disabled={pending}>
        {pending ? "Saving…" : "Record decision"}
      </Button>
      <p role="status">{result.error ?? result.message}</p>
    </form>
  );
}

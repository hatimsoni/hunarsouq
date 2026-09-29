"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { reviewSchema } from "@/lib/admin-validation";
import { reviewProfile, type AdminResult } from "@/app/admin/actions";
import type { Profile } from "@/lib/supabase/database.types";
import { Field, inputClass } from "@/components/form-field";
import { Button } from "@/components/ui/button";
export function ReviewForm({
  profile,
  ownProfile,
}: {
  profile: Pick<Profile, "id" | "status" | "role" | "updated_at">;
  ownProfile: boolean;
}) {
  const [result, setResult] = useState<AdminResult>({});
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<z.infer<typeof reviewSchema>>({
    resolver: zodResolver(reviewSchema),
    defaultValues: {
      profile_id: profile.id,
      revision: profile.updated_at,
      note: "",
    },
  });
  const decisions =
    profile.status === "pending"
      ? [
          ["approve", "Approve and verify"],
          ["request_changes", "Request changes"],
          ["reject", "Reject submission"],
        ]
      : profile.status === "suspended"
        ? [["restore", "Restore as a draft"]]
        : [];
  if (profile.status !== "suspended" && profile.role !== "admin")
    decisions.push(["suspend", "Suspend profile"]);
  if (ownProfile)
    return (
      <p className="rounded-xl border p-5 text-sm text-muted-foreground">
        Another administrator must review your profile. Self-review is disabled.
      </p>
    );
  if (!decisions.length)
    return (
      <p className="rounded-xl border p-5 text-sm text-muted-foreground">
        There are no review actions available for this profile.
      </p>
    );
  return (
    <form
      className="space-y-5 rounded-xl border bg-background p-6"
      onSubmit={handleSubmit((value) =>
        startTransition(async () => {
          setResult({});
          try {
            const response = await reviewProfile({
              ...value,
              revision: profile.updated_at,
            });
            setResult(response);
            if (!response.error) {
              reset({
                profile_id: profile.id,
                revision: profile.updated_at,
                note: "",
              });
              router.refresh();
            }
          } catch {
            setResult({
              error:
                "The decision could not be confirmed. Reload this page before trying again.",
            });
          }
        }),
      )}
      noValidate
    >
      <h2 className="text-xl">Your review decision</h2>
      <Field label="Decision" id="decision" error={errors.decision?.message}>
        <select
          id="decision"
          className={inputClass}
          disabled={pending}
          {...register("decision")}
        >
          <option value="">Choose a decision</option>
          {decisions.map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </Field>
      <Field
        label="Decision note"
        id="note"
        hint="Required and shared with the member for rejection, requested changes, or suspension. Approval and restoration notes stay in review history."
        error={errors.note?.message}
      >
        <textarea
          id="note"
          rows={4}
          maxLength={2000}
          className={inputClass}
          disabled={pending}
          {...register("note")}
        />
      </Field>
      <p className="text-xs leading-6 text-muted-foreground">
        Approval makes the profile public. Suspension removes it and pauses
        editing. Restoring creates a draft for the member to resubmit.
      </p>
      {result.error && (
        <p role="alert" className="text-sm text-destructive">
          {result.error}
        </p>
      )}
      {result.message && (
        <p
          role="status"
          className="rounded-lg bg-secondary p-3 text-sm leading-6"
        >
          {result.message}
        </p>
      )}
      <Button disabled={pending} type="submit" className="h-12 w-full">
        {pending ? "Recording decision…" : "Record decision"}
      </Button>
    </form>
  );
}

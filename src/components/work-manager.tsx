"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "./ui/button";
import { Field, inputClass } from "./form-field";
import { deleteWorkItem, saveWork } from "@/app/account/work/actions";
import type { Business, WorkExperience } from "@/lib/supabase/database.types";
import { businessTypes } from "@/lib/business-validation";
export function WorkManager({
  businesses,
  experiences,
  suspended,
}: {
  businesses: Business[];
  experiences: WorkExperience[];
  suspended: boolean;
}) {
  const count = businesses.length + experiences.length;
  const full = count >= 5;
  const router = useRouter();
  const [editing, setEditing] = useState<WorkExperience | null | undefined>(
    undefined,
  );
  const [pending, start] = useTransition();
  const [message, setMessage] = useState("");
  const [removing, setRemoving] = useState<{
    id: string;
    kind: "business" | "experience";
    revision: string;
    name: string;
  } | null>(null);
  return (
    <div className="mt-8 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl">Your businesses & experience</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            {count} of 5 spaces used across both. Drafts count too.
          </p>
        </div>
        {!suspended && (
          <div className="flex flex-wrap gap-3">
            {full ? (
              <Button disabled>Add business</Button>
            ) : (
              <Button asChild>
                <Link href="/account/business/new">Add business</Link>
              </Button>
            )}
            <Button
              variant="outline"
              disabled={full || pending}
              onClick={() => {
                setEditing(null);
                setMessage("");
              }}
            >
              Add work experience
            </Button>
          </div>
        )}
      </div>
      {full && (
        <p className="text-sm">
          All five spaces are used. You can edit your items or remove one to add
          another.
        </p>
      )}
      {suspended && (
        <p className="rounded-xl border p-4">
          Editing is paused while your profile is suspended.
        </p>
      )}
      {businesses.map((b) => (
        <article key={b.id} className="rounded-xl border bg-background p-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h3 className="text-xl">{b.name}</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                {businessTypes[b.type]} · {b.status.replaceAll("_", " ")}
              </p>
              <p className="mt-2 text-xs">
                A listing is public only while both it and your profile are
                approved.
              </p>
            </div>
            {!suspended && b.status !== "suspended" && (
              <div className="flex gap-2">
                <Button asChild variant="outline">
                  <Link href={`/account/business/${b.id}`}>Edit business</Link>
                </Button>
                <Button
                  variant="ghost"
                  disabled={pending}
                  onClick={() =>
                    setRemoving({
                      id: b.id,
                      kind: "business",
                      revision: b.updated_at,
                      name: b.name,
                    })
                  }
                >
                  Remove
                </Button>
              </div>
            )}
          </div>
          {b.rejection_note && (
            <p className="mt-4 whitespace-pre-wrap rounded-lg bg-secondary p-4 text-sm">
              Review note: {b.rejection_note}
            </p>
          )}
        </article>
      ))}
      {experiences.map((w) => (
        <article key={w.id} className="rounded-xl border bg-background p-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h3 className="text-xl">{w.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                {w.organisation} · {w.start_date} — {w.end_date ?? "Present"}
              </p>
              <p className="mt-3 whitespace-pre-wrap break-words text-sm">
                {w.description}
              </p>
            </div>
            {!suspended && (
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  disabled={pending}
                  onClick={() => {
                    setEditing(w);
                    setMessage("");
                  }}
                >
                  Edit experience
                </Button>
                <Button
                  variant="ghost"
                  disabled={pending}
                  onClick={() =>
                    setRemoving({
                      id: w.id,
                      kind: "experience",
                      revision: w.updated_at,
                      name: w.title,
                    })
                  }
                >
                  Remove
                </Button>
              </div>
            )}
          </div>
        </article>
      ))}
      {count === 0 && (
        <p className="rounded-xl border border-dashed p-6 text-muted-foreground">
          Add a business you run or a role that tells your professional story.
        </p>
      )}
      {removing && (
        <div role="alert" className="rounded-xl border bg-background p-5">
          <p>
            Remove “{removing.name}”? This permanently deletes the entry and
            frees one space.
          </p>
          <div className="mt-4 flex gap-3">
            <Button
              disabled={pending}
              onClick={() =>
                start(async () => {
                  try {
                    const result = await deleteWorkItem(
                      removing.kind,
                      removing.id,
                      removing.revision,
                    );
                    setMessage(result.error ?? "Item removed.");
                    if (result.success) {
                      setRemoving(null);
                      setEditing(undefined);
                      router.refresh();
                    }
                  } catch {
                    setMessage(
                      "Could not confirm removal. Reload before trying again.",
                    );
                  }
                })
              }
            >
              Confirm removal
            </Button>
            <Button
              variant="outline"
              disabled={pending}
              onClick={() => setRemoving(null)}
            >
              Cancel
            </Button>
          </div>
        </div>
      )}
      {!suspended && editing !== undefined && (
        <form
          key={editing?.id ?? "new"}
          className="space-y-4 rounded-xl border bg-background p-6"
          onSubmit={(e) => {
            e.preventDefault();
            const form = new FormData(e.currentTarget);
            start(async () => {
              try {
                const result = await saveWork(
                  Object.fromEntries(form),
                  editing?.id,
                  editing?.updated_at,
                );
                setMessage(result.error ?? "Work experience saved.");
                if (!result.error) {
                  setEditing(undefined);
                  router.refresh();
                }
              } catch {
                setMessage("Could not save this entry. Please try again.");
              }
            });
          }}
        >
          <h3 className="text-2xl">
            {editing ? "Edit" : "Add"} work experience
          </h3>
          <p className="text-sm text-muted-foreground">
            These details appear on your Hunar profile while it is approved.
            They have no separate listing.
          </p>
          <fieldset disabled={pending} className="grid gap-4 sm:grid-cols-2">
            <Field id="work-title" label="Role or title">
              <input
                id="work-title"
                name="title"
                defaultValue={editing?.title}
                required
                minLength={2}
                maxLength={120}
                className={inputClass}
              />
            </Field>
            <Field id="work-organisation" label="Organisation">
              <input
                id="work-organisation"
                name="organisation"
                defaultValue={editing?.organisation}
                required
                minLength={2}
                maxLength={120}
                className={inputClass}
              />
            </Field>
            <Field id="work-start" label="Start date">
              <input
                id="work-start"
                name="start_date"
                type="date"
                min="1900-01-01"
                required
                defaultValue={editing?.start_date}
                className={inputClass}
              />
            </Field>
            <Field
              id="work-end"
              label="End date"
              hint="Leave blank for a current role."
            >
              <input
                id="work-end"
                name="end_date"
                type="date"
                min="1900-01-01"
                defaultValue={editing?.end_date ?? ""}
                className={inputClass}
              />
            </Field>
            <div className="sm:col-span-2">
              <Field id="work-description" label="What you did">
                <textarea
                  id="work-description"
                  name="description"
                  maxLength={2000}
                  rows={4}
                  defaultValue={editing?.description}
                  className={inputClass}
                />
              </Field>
            </div>
          </fieldset>
          <div className="flex gap-3">
            <Button disabled={pending}>
              {pending ? "Saving…" : "Save experience"}
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={pending}
              onClick={() => setEditing(undefined)}
            >
              Cancel
            </Button>
          </div>
        </form>
      )}
      <p role="status" className="text-sm">
        {message}
      </p>
    </div>
  );
}

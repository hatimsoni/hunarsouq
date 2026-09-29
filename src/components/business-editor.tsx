"use client";
import { useState, useTransition, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { Button } from "./ui/button";
import { Field, inputClass } from "./form-field";
import {
  businessTypes,
  emptyBusiness,
  type BusinessInput,
} from "@/lib/business-validation";
import type { Business } from "@/lib/supabase/database.types";
import { saveBusiness, uploadBusinessImage } from "@/app/account/work/actions";
import { compressImage } from "@/lib/image";
export function BusinessEditor({
  business,
  previews: initialPreviews = {},
}: {
  business: Business | null;
  previews?: Record<string, string>;
}) {
  const router = useRouter();
  const [value, setValue] = useState<BusinessInput>(
    business ? { ...business, logo: business.logo ?? "" } : emptyBusiness,
  );
  const [previews, setPreviews] = useState(initialPreviews);
  const [pending, start] = useTransition();
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [dirty, setDirty] = useState(false);
  const busy = pending || uploading;
  useEffect(() => {
    if (!dirty) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [dirty]);
  function change<K extends keyof BusinessInput>(
    key: K,
    next: BusinessInput[K],
  ) {
    setDirty(true);
    setValue((v) => ({ ...v, [key]: next }));
  }
  async function upload(files: FileList | null, kind: "logo" | "photos") {
    if (!files?.length) return;
    setError("");
    if (kind === "photos" && value.photos.length + files.length > 6) {
      setError("Choose up to six business photos.");
      return;
    }
    setUploading(true);
    try {
      for (const file of Array.from(files).slice(0, kind === "logo" ? 1 : 6)) {
        const form = new FormData();
        form.set("file", await compressImage(file));
        const result = await uploadBusinessImage(form);
        if (result.error || !result.path || !result.url)
          throw new Error(result.error ?? "Upload failed.");
        setPreviews((p) => ({ ...p, [result.path!]: result.url! }));
        setValue((v) => ({
          ...v,
          [kind]: kind === "logo" ? result.path! : [...v.photos, result.path!],
        }));
        setDirty(true);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed.");
    } finally {
      setUploading(false);
    }
  }
  function save(intent: "draft" | "submit") {
    start(async () => {
      setError("");
      try {
        const result = await saveBusiness(
          value,
          intent,
          business?.id,
          business?.updated_at,
        );
        if (result.error) setError(result.error);
        else {
          setDirty(false);
          router.push("/account");
          router.refresh();
        }
      } catch {
        setError(
          "Could not confirm the save. Reload your account before trying again.",
        );
      }
    });
  }
  const field = (
    key: Exclude<
      keyof BusinessInput,
      "type" | "photos" | "show_call" | "show_email" | "logo"
    >,
    label: string,
    max: number,
    type = "text",
  ) => (
    <Field id={`business-${key}`} label={label}>
      <input
        id={`business-${key}`}
        type={type}
        value={value[key]}
        onChange={(e) => change(key, e.target.value)}
        maxLength={max}
        className={inputClass}
      />
    </Field>
  );
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        save("submit");
      }}
      className="mx-auto max-w-3xl space-y-6"
    >
      <Link href="/account" className="text-sm underline">
        ← Back to your account
      </Link>
      <h1 className="text-4xl">
        {business ? "Edit your business" : "Tell us about your business"}
      </h1>
      <p className="text-muted-foreground">
        Your business has its own contact details. Publication requires approval
        of both this listing and your Hunar profile. Editing an approved listing
        sends it back for review.
      </p>
      {business?.rejection_note && (
        <p className="rounded-xl bg-secondary p-4">
          Review note: {business.rejection_note}
        </p>
      )}
      <fieldset
        disabled={busy}
        className="space-y-6 rounded-2xl border bg-background p-6"
      >
        <div className="grid gap-4 sm:grid-cols-2">
          {field("name", "Business name", 100)}
          {field("slug", "URL name (lowercase with hyphens)", 80)}
          <Field id="business-type" label="Business type">
            <select
              id="business-type"
              value={value.type}
              onChange={(e) =>
                change("type", e.target.value as BusinessInput["type"])
              }
              className={inputClass}
            >
              {Object.entries(businessTypes).map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </select>
          </Field>
          {field("city", "City", 100)}
        </div>
        <Field
          id="business-description"
          label="About your business"
          hint="At least 30 characters when submitting for review."
        >
          <textarea
            id="business-description"
            value={value.description}
            onChange={(e) => change("description", e.target.value)}
            maxLength={3000}
            rows={6}
            className={inputClass}
          />
        </Field>
        {field("address", "Public address (optional)", 300)}
        <section>
          <h2 className="mb-3 text-2xl">Logo & photos</h2>
          <p className="mb-4 text-sm text-muted-foreground">
            JPG, PNG or WebP originals up to 10 MB. Up to six photos.
          </p>
          {(["logo", "photos"] as const).map((kind) => (
            <div key={kind} className="mt-5">
              <div className="mb-3 flex flex-wrap gap-3">
                {(kind === "logo"
                  ? value.logo
                    ? [value.logo]
                    : []
                  : value.photos
                ).map((path) => (
                  <div key={path} className="w-28">
                    {previews[path] && (
                      <Image
                        src={previews[path]}
                        alt={
                          kind === "logo" ? "Business logo" : "Business photo"
                        }
                        width={112}
                        height={112}
                        unoptimized
                        className="size-28 rounded-lg object-cover"
                      />
                    )}
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() =>
                        change(
                          kind,
                          kind === "logo"
                            ? ""
                            : value.photos.filter((p) => p !== path),
                        )
                      }
                    >
                      Remove {kind === "logo" ? "logo" : "photo"}
                    </Button>
                  </div>
                ))}
              </div>
              <Field
                id={`business-upload-${kind}`}
                label={kind === "logo" ? "Choose logo" : "Add photos"}
              >
                <input
                  id={`business-upload-${kind}`}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  multiple={kind === "photos"}
                  className={inputClass}
                  onChange={(e) => {
                    void upload(e.target.files, kind);
                    e.target.value = "";
                  }}
                />
              </Field>
            </div>
          ))}
        </section>
        <section className="space-y-4 border-t pt-5">
          <h2 className="text-2xl">How customers can reach you</h2>
          <p className="text-sm text-muted-foreground">
            Phone, WhatsApp and email are fetched only when a visitor opens
            Contact. Adding WhatsApp enables that option.
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            {field("phone", "Business phone", 16, "tel")}
            {field("whatsapp", "Business WhatsApp", 16, "tel")}
            {field("email", "Business email", 254, "email")}
            {field("website", "Website (https://)", 700, "url")}
            {field("instagram", "Instagram (https://)", 700, "url")}
          </div>
          <label className="flex min-h-11 items-center gap-2">
            <input
              type="checkbox"
              checked={value.show_call}
              onChange={(e) => change("show_call", e.target.checked)}
            />
            Show Call option
          </label>
          <label className="flex min-h-11 items-center gap-2">
            <input
              type="checkbox"
              checked={value.show_email}
              onChange={(e) => change("show_email", e.target.checked)}
            />
            Show Email option
          </label>
        </section>
      </fieldset>
      {uploading && <p role="status">Preparing and uploading your images…</p>}
      {error && (
        <p role="alert" className="rounded-xl bg-red-50 p-4 text-destructive">
          {error}
        </p>
      )}
      <div className="flex flex-wrap gap-3">
        <Button disabled={busy} type="submit">
          {pending ? "Saving…" : "Submit for review"}
        </Button>
        <Button
          disabled={busy}
          type="button"
          variant="outline"
          onClick={() => save("draft")}
        >
          {business?.status === "approved"
            ? "Save changes for review"
            : "Save draft"}
        </Button>
      </div>
    </form>
  );
}

"use client";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm, useWatch, type FieldPath } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  LoaderCircle,
  ShieldCheck,
  Upload,
  UserRound,
  X,
} from "lucide-react";
import {
  profileSchema,
  usernameSchema,
  type ProfileInput,
} from "@/lib/validation";
import { compressImage } from "@/lib/image";
import {
  checkUsername,
  saveProfile,
  uploadProfileImage,
} from "@/app/account/actions";
import type { Category, Profile } from "@/lib/supabase/database.types";
import { Button } from "./ui/button";
import { Field, inputClass } from "./form-field";

const steps = [
  "The basics",
  "Your hunar",
  "Where you work",
  "Contact choices",
  "Your work & links",
  "Review & submit",
];
const fields: FieldPath<ProfileInput>[][] = [
  ["full_name", "username", "photo_url"],
  ["category_id", "sub_skills", "bio", "years_experience"],
  ["city", "state", "country", "availability"],
  ["phone", "whatsapp", "email_public", "show_call", "show_email"],
  ["links", "portfolio_images"],
  [],
];
const availabilityLabels = {
  available: "Available for work",
  busy: "Busy right now",
  not_taking_work: "Not taking work",
};
export function ProfileWizard({
  initial,
  revision: initialRevision,
  status,
  categories,
  previews: initialPreviews,
}: {
  initial: ProfileInput;
  revision: string;
  status: Profile["status"];
  categories: Category[];
  previews: Record<string, string>;
}) {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [revision, setRevision] = useState(initialRevision);
  const [previews, setPreviews] = useState(initialPreviews);
  const [usernameState, setUsernameState] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [uploading, setUploading] = useState(false);
  const [pending, startTransition] = useTransition();
  const heading = useRef<HTMLHeadingElement>(null);
  const {
    register,
    control,
    getValues,
    setValue,
    trigger,
    reset,
    formState: { errors, isDirty },
  } = useForm<ProfileInput>({
    resolver: zodResolver(profileSchema),
    defaultValues: initial,
    mode: "onTouched",
  });
  const values = useWatch({ control }) as ProfileInput;
  const busy = pending || uploading;

  useEffect(() => {
    if (!isDirty) return;
    const protect = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", protect);
    return () => window.removeEventListener("beforeunload", protect);
  }, [isDirty]);
  useEffect(() => {
    const username = values.username;
    let cancelled = false;
    const timer = setTimeout(async () => {
      if (!usernameSchema.safeParse(username).success) {
        if (!cancelled) setUsernameState("");
        return;
      }
      setUsernameState("Checking availability…");
      try {
        const result = await checkUsername(username);
        if (!cancelled)
          setUsernameState(
            result.error ??
              (result.available
                ? "This username is available."
                : "This username is already taken."),
          );
      } catch {
        if (!cancelled)
          setUsernameState(
            "Unable to check right now. We’ll check again when you save.",
          );
      }
    }, 450);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [values.username]);

  const move = (value: number) => {
    setStep(value);
    setError("");
    setMessage("");
    setTimeout(() => heading.current?.focus(), 0);
  };
  const nextStep = async () => {
    if (await trigger(fields[step], { shouldFocus: true }))
      move(Math.min(5, step + 1));
  };
  const save = async (intent: "draft" | "submit") => {
    setError("");
    setMessage("");
    if (
      intent === "submit" &&
      !(await trigger(undefined, { shouldFocus: true }))
    ) {
      const parsed = profileSchema.safeParse(getValues());
      if (!parsed.success) {
        const root = String(parsed.error.issues[0].path[0]);
        const index = fields.findIndex((group) =>
          group.includes(root as FieldPath<ProfileInput>),
        );
        move(Math.max(0, index));
        setError("Check the highlighted details before submitting.");
      }
      return;
    }
    const submitted = getValues();
    startTransition(async () => {
      try {
        const result = await saveProfile(submitted, intent, revision);
        if (result.error) {
          setError(result.error);
          return;
        }
        if (result.revision) setRevision(result.revision);
        reset(submitted);
        if (intent === "submit") {
          router.push("/account");
          router.refresh();
        } else {
          setMessage(
            result.status === "pending"
              ? "Changes saved and sent for review. Your profile will be hidden until approved again."
              : "Draft saved. You can come back and finish later.",
          );
        }
      } catch {
        setError(
          "We couldn’t save your profile. Please check your connection and try again.",
        );
      }
    });
  };
  const upload = async (
    files: FileList | null,
    kind: "photo" | "portfolio",
  ) => {
    if (!files?.length) return;
    setError("");
    setMessage("");
    if (
      kind === "portfolio" &&
      getValues("portfolio_images").length + files.length > 6
    ) {
      setError("You can add up to six portfolio images.");
      return;
    }
    setUploading(true);
    try {
      for (const file of Array.from(files).slice(0, kind === "photo" ? 1 : 6)) {
        const compressed = await compressImage(file);
        const form = new FormData();
        form.set("file", compressed);
        const result = await uploadProfileImage(form);
        if (result.error || !result.path || !result.url)
          throw new Error(result.error || "Upload failed. Please try again.");
        setPreviews((previous) => ({
          ...previous,
          [result.path!]: result.url!,
        }));
        if (kind === "photo")
          setValue("photo_url", result.path, {
            shouldDirty: true,
            shouldValidate: true,
          });
        else
          setValue(
            "portfolio_images",
            [...getValues("portfolio_images"), result.path],
            { shouldDirty: true, shouldValidate: true },
          );
      }
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Upload failed. Please try again.",
      );
    } finally {
      setUploading(false);
    }
  };
  const textField = (
    name:
      | "full_name"
      | "username"
      | "bio"
      | "sub_skills"
      | "city"
      | "state"
      | "country"
      | "phone"
      | "whatsapp"
      | "email_public",
    label: string,
    hint?: string,
    type = "text",
  ) => (
    <Field
      key={name}
      id={name}
      label={label}
      hint={hint}
      error={errors[name]?.message}
    >
      <input
        id={name}
        type={type}
        className={inputClass}
        {...register(name)}
        aria-invalid={!!errors[name]}
        aria-describedby={
          errors[name] ? `${name}-error` : hint ? `${name}-hint` : undefined
        }
        autoComplete={
          name === "full_name"
            ? "name"
            : name === "email_public"
              ? "email"
              : name === "phone"
                ? "tel"
                : "off"
        }
      />
    </Field>
  );
  return (
    <div className="mx-auto max-w-5xl">
      <Link
        href="/account"
        className="mb-6 inline-flex min-h-11 items-center gap-2 text-sm"
        onClick={(event) => {
          if (isDirty && !window.confirm("Leave without saving your changes?"))
            event.preventDefault();
        }}
      >
        <ArrowLeft size={16} />
        Back to your account
      </Link>
      <h1 className="text-3xl sm:text-4xl">Let your hunar shine.</h1>
      <p className="mt-3 max-w-2xl text-sm leading-7 text-muted-foreground">
        A little about you. A glimpse of your work. Your profile will only
        become public after our team reviews it.
      </p>
      {status === "approved" && (
        <p className="mt-5 rounded-xl border border-[#e6ce96] bg-[#fbf1d8] p-4 text-sm leading-6">
          Saving any changes returns your approved profile to pending review and
          removes its Verified badge until it is approved again.
        </p>
      )}
      <div className="mt-9 grid gap-7 lg:grid-cols-[210px_1fr]">
        <nav
          aria-label="Profile steps"
          className="flex gap-2 overflow-x-auto pb-2 lg:block lg:space-y-2"
        >
          {steps.map((title, index) => (
            <button
              key={title}
              type="button"
              disabled={busy || index > step}
              aria-current={index === step ? "step" : undefined}
              onClick={() => move(index)}
              className={`flex min-h-12 shrink-0 items-center gap-3 rounded-lg px-3 text-left text-sm lg:w-full ${index === step ? "bg-primary text-white" : "text-muted-foreground"} disabled:cursor-default`}
            >
              <span
                className={`flex size-6 shrink-0 items-center justify-center rounded-full border text-xs ${index === step ? "border-white/40" : "border-border"}`}
              >
                {index < step ? <Check size={13} /> : index + 1}
              </span>
              <span className={index === step ? "" : "hidden lg:block"}>
                {title}
              </span>
            </button>
          ))}
        </nav>
        <form
          className="min-w-0 rounded-2xl border bg-background p-5 shadow-sm sm:p-8"
          noValidate
          onSubmit={(event) => {
            event.preventDefault();
            if (step === 5) void save("submit");
            else void nextStep();
          }}
          aria-busy={busy}
        >
          <p className="eyebrow mb-2">Step {step + 1} of 6</p>
          <h2
            ref={heading}
            tabIndex={-1}
            className="mb-7 text-2xl outline-none"
          >
            {steps[step]}
          </h2>
          <fieldset disabled={busy} className="min-w-0 space-y-5">
            {step === 0 && (
              <>
                <div className="flex flex-wrap items-center gap-5">
                  <div className="flex size-24 items-center justify-center overflow-hidden rounded-full bg-secondary">
                    {values.photo_url && previews[values.photo_url] ? (
                      <Image
                        src={previews[values.photo_url]}
                        unoptimized
                        width={96}
                        height={96}
                        alt="Your profile photo preview"
                        className="size-24 object-cover"
                      />
                    ) : (
                      <UserRound size={35} strokeWidth={1.2} />
                    )}
                  </div>
                  <div>
                    <label
                      htmlFor="photo-upload"
                      className="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-lg border px-4 text-sm"
                    >
                      <Upload size={16} />
                      Choose a photo
                      <input
                        id="photo-upload"
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        className="sr-only"
                        onChange={(event) => {
                          void upload(event.target.files, "photo");
                          event.target.value = "";
                        }}
                      />
                    </label>
                    <p className="mt-2 text-xs text-muted-foreground">
                      Optional. JPG, PNG, or WebP, up to 10 MB.
                    </p>
                    {values.photo_url && (
                      <button
                        type="button"
                        className="mt-2 min-h-11 text-xs underline"
                        onClick={() =>
                          setValue("photo_url", "", { shouldDirty: true })
                        }
                      >
                        Use the default avatar
                      </button>
                    )}
                  </div>
                </div>
                {textField("full_name", "Full name")}
                {textField(
                  "username",
                  "Your username",
                  "Your public address will end in /your_username. Use lowercase letters, numbers, and underscores.",
                )}
                {usernameState && (
                  <p role="status" className="text-xs text-muted-foreground">
                    {usernameState}
                  </p>
                )}
              </>
            )}
            {step === 1 && (
              <>
                <Field
                  id="category_id"
                  label="Your main skill"
                  error={errors.category_id?.message}
                >
                  <select
                    id="category_id"
                    className={inputClass}
                    {...register("category_id")}
                    aria-invalid={!!errors.category_id}
                  >
                    <option value="">Choose a category</option>
                    {categories.map((category) => (
                      <option key={category.id} value={category.id}>
                        {category.name}
                      </option>
                    ))}
                  </select>
                </Field>
                {textField(
                  "sub_skills",
                  "What do you specialise in?",
                  "Optional. Separate up to 12 skills with commas, for example: alterations, embroidery, bridal wear.",
                )}
                <Field
                  id="bio"
                  label="Tell your story"
                  error={errors.bio?.message}
                  hint="30–2,000 characters. Share what you do, who you help, and what makes your work yours."
                >
                  <textarea
                    id="bio"
                    rows={6}
                    className={inputClass}
                    {...register("bio")}
                    aria-invalid={!!errors.bio}
                    aria-describedby={errors.bio ? "bio-error" : "bio-hint"}
                  />
                </Field>
                <Field
                  id="years_experience"
                  label="Years of experience"
                  error={errors.years_experience?.message}
                >
                  <input
                    id="years_experience"
                    type="number"
                    min={0}
                    max={80}
                    className={inputClass}
                    {...register("years_experience", { valueAsNumber: true })}
                  />
                </Field>
              </>
            )}
            {step === 2 && (
              <>
                {textField("city", "City")}
                {textField("state", "State / region (optional)")}
                {textField("country", "Country")}
                <Field
                  id="availability"
                  label="Your availability"
                  error={errors.availability?.message}
                >
                  <select
                    id="availability"
                    className={inputClass}
                    {...register("availability")}
                  >
                    {Object.entries(availabilityLabels).map(
                      ([value, label]) => (
                        <option key={value} value={value}>
                          {label}
                        </option>
                      ),
                    )}
                  </select>
                </Field>
              </>
            )}
            {step === 3 && (
              <>
                <div className="flex items-start gap-3 rounded-xl bg-secondary p-4 text-sm leading-6">
                  <ShieldCheck className="mt-1 size-5 shrink-0" />
                  <p>
                    Your numbers will never appear as plain text on your public
                    page. Choose which contact buttons visitors can use after
                    tapping Contact.
                  </p>
                </div>
                {textField(
                  "phone",
                  "Phone number (optional)",
                  "Use your country code, for example +919876543210.",
                  "tel",
                )}
                <label className="flex min-h-12 items-center gap-3 text-sm">
                  <input
                    type="checkbox"
                    className="size-5 accent-primary"
                    {...register("show_call")}
                  />
                  Allow visitors to call me
                </label>
                {textField(
                  "whatsapp",
                  "WhatsApp number (optional)",
                  "Adding a number enables a WhatsApp button. Leave blank to keep it off.",
                  "tel",
                )}
                {textField(
                  "email_public",
                  "Contact email (optional)",
                  "This can be different from your sign-in email.",
                  "email",
                )}
                <label className="flex min-h-12 items-center gap-3 text-sm">
                  <input
                    type="checkbox"
                    className="size-5 accent-primary"
                    {...register("show_email")}
                  />
                  Allow visitors to email me
                </label>
              </>
            )}
            {step === 4 && (
              <>
                <div>
                  <h3 className="font-sans text-sm font-semibold">
                    Your portfolio{" "}
                    <span className="font-normal text-muted-foreground">
                      ({values.portfolio_images?.length || 0}/6)
                    </span>
                  </h3>
                  <p className="my-2 text-xs leading-6 text-muted-foreground">
                    Share work you own or have permission to show. Images stay
                    private while your profile is reviewed.
                  </p>
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                    {values.portfolio_images?.map((path, index) => (
                      <div
                        key={path}
                        className="relative aspect-square overflow-hidden rounded-xl border bg-secondary"
                      >
                        {previews[path] ? (
                          <Image
                            src={previews[path]}
                            alt={`Portfolio image ${index + 1}`}
                            fill
                            unoptimized
                            className="object-cover"
                          />
                        ) : (
                          <span className="p-3 text-xs">
                            Preview unavailable
                          </span>
                        )}
                        <button
                          type="button"
                          aria-label={`Remove portfolio image ${index + 1}`}
                          className="absolute right-1 top-1 flex size-11 items-center justify-center rounded-full bg-white shadow"
                          onClick={() =>
                            setValue(
                              "portfolio_images",
                              getValues("portfolio_images").filter(
                                (item) => item !== path,
                              ),
                              { shouldDirty: true },
                            )
                          }
                        >
                          <X size={16} />
                        </button>
                      </div>
                    ))}
                  </div>
                  {(values.portfolio_images?.length || 0) < 6 && (
                    <label
                      htmlFor="portfolio-upload"
                      className="mt-4 flex min-h-20 cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed p-4 text-sm"
                    >
                      <Upload size={18} />
                      Add portfolio images
                      <input
                        id="portfolio-upload"
                        type="file"
                        multiple
                        accept="image/jpeg,image/png,image/webp"
                        className="sr-only"
                        onChange={(event) => {
                          void upload(event.target.files, "portfolio");
                          event.target.value = "";
                        }}
                      />
                    </label>
                  )}
                </div>
                <div className="space-y-4 border-t pt-5">
                  <p className="text-sm font-semibold">
                    Where else can people find your work?
                  </p>
                  {(
                    [
                      "instagram",
                      "website",
                      "portfolio",
                      "youtube",
                      "linkedin",
                    ] as const
                  ).map((name) => (
                    <Field
                      key={name}
                      id={`links.${name}`}
                      label={`${name.charAt(0).toUpperCase() + name.slice(1)} (optional)`}
                      error={errors.links?.[name]?.message}
                    >
                      <input
                        id={`links.${name}`}
                        type="url"
                        placeholder="https://"
                        className={inputClass}
                        {...register(`links.${name}`)}
                        aria-invalid={!!errors.links?.[name]}
                      />
                    </Field>
                  ))}
                </div>
              </>
            )}
            {step === 5 && (
              <>
                <div className="flex items-center gap-4">
                  <div className="flex size-16 items-center justify-center overflow-hidden rounded-full bg-secondary">
                    {values.photo_url && previews[values.photo_url] ? (
                      <Image
                        src={previews[values.photo_url]}
                        alt="Your profile preview"
                        width={64}
                        height={64}
                        unoptimized
                        className="size-16 object-cover"
                      />
                    ) : (
                      <UserRound size={28} />
                    )}
                  </div>
                  <div>
                    <h3 className="text-xl">{values.full_name}</h3>
                    <p className="text-sm text-muted-foreground">
                      @{values.username}
                    </p>
                  </div>
                </div>
                <dl className="space-y-4 text-sm">
                  {[
                    [
                      "Skill",
                      categories.find(
                        (category) => category.id === values.category_id,
                      )?.name || "Not selected",
                    ],
                    ["Specialities", values.sub_skills || "None added"],
                    ["About you", values.bio],
                    [
                      "Location",
                      [values.city, values.state, values.country]
                        .filter(Boolean)
                        .join(", "),
                    ],
                    ["Experience", `${values.years_experience} years`],
                    ["Availability", availabilityLabels[values.availability]],
                    ["Calls", values.show_call ? values.phone : "Off"],
                    ["WhatsApp", values.whatsapp || "Off"],
                    ["Email", values.show_email ? values.email_public : "Off"],
                    [
                      "Portfolio",
                      `${values.portfolio_images?.length || 0} images`,
                    ],
                    ...Object.entries(values.links || {})
                      .filter(([, value]) => value)
                      .map(([key, value]) => [key, value]),
                  ].map(([label, value]) => (
                    <div key={label} className="border-b pb-4">
                      <dt className="mb-1 font-medium capitalize">{label}</dt>
                      <dd className="whitespace-pre-wrap break-words leading-6 text-muted-foreground">
                        {value}
                      </dd>
                    </div>
                  ))}
                </dl>
                <p className="rounded-lg bg-secondary p-4 text-sm leading-6">
                  Ready? Submit your profile for human review. You can check its
                  status and any review notes from your account.
                </p>
              </>
            )}
          </fieldset>
          {uploading && (
            <p role="status" className="mt-5 flex items-center gap-2 text-sm">
              <LoaderCircle className="size-4 animate-spin" />
              Preparing and uploading your image…
            </p>
          )}
          {error && (
            <p
              role="alert"
              className="mt-5 rounded-lg bg-red-50 p-4 text-sm text-destructive"
            >
              {error}
            </p>
          )}
          {message && (
            <p
              role="status"
              className="mt-5 rounded-lg bg-secondary p-4 text-sm"
            >
              {message}
            </p>
          )}
          <div className="mt-8 flex flex-wrap items-center justify-between gap-3 border-t pt-6">
            <div className="flex gap-2">
              {step > 0 && (
                <Button
                  type="button"
                  disabled={busy}
                  variant="outline"
                  className="h-11"
                  onClick={() => move(step - 1)}
                >
                  <ArrowLeft />
                  Back
                </Button>
              )}
              <Button
                type="button"
                disabled={busy}
                variant="ghost"
                className="h-11"
                onClick={() => void save("draft")}
              >
                Save draft
              </Button>
            </div>
            <Button type="submit" disabled={busy} className="h-11">
              {pending ? <LoaderCircle className="animate-spin" /> : null}
              {step === 5 ? "Submit for review" : "Continue"}
              <ArrowRight />
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

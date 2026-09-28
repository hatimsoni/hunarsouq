"use client";
import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ArrowRight, LoaderCircle, MailCheck } from "lucide-react";
import {
  authenticate,
  googleSignIn,
  type AuthResult,
} from "@/app/auth/actions";
import {
  loginSchema,
  signupSchema,
  forgotSchema,
  resetSchema,
} from "@/lib/validation";
import { Button } from "./ui/button";
import { Field, inputClass } from "./form-field";

export type AuthMode = "login" | "signup" | "forgot" | "reset";
const schemas = {
  login: loginSchema,
  signup: signupSchema,
  forgot: forgotSchema,
  reset: resetSchema,
};
export function AuthForm({
  mode,
  configured,
  next,
  notice,
}: {
  mode: AuthMode;
  configured: boolean;
  next?: string;
  notice?: string;
}) {
  const router = useRouter();
  const [result, setResult] = useState<AuthResult>({});
  const [pending, startTransition] = useTransition();
  const schema = useMemo(
    () =>
      z
        .object({
          full_name: z.string(),
          email: z.string(),
          password: z.string(),
          confirm: z.string(),
        })
        .superRefine((value, ctx) => {
          const parsed = schemas[mode].safeParse(value);
          if (!parsed.success)
            parsed.error.issues.forEach((issue) =>
              ctx.addIssue({
                code: "custom",
                path: issue.path,
                message: issue.message,
              }),
            );
        }),
    [mode],
  );
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(schema),
    defaultValues: { full_name: "", email: "", password: "", confirm: "" },
  });
  const submit = handleSubmit((values) =>
    startTransition(async () => {
      setResult({});
      try {
        const response = await authenticate(mode, values, next);
        setResult(response);
        if (response.destination) {
          router.push(response.destination);
          router.refresh();
        }
      } catch {
        setResult({ error: "Connection interrupted. Please try again." });
      }
    }),
  );
  const oauth = () =>
    startTransition(async () => {
      setResult({});
      try {
        const response = await googleSignIn();
        setResult(response);
        if (response.destination) window.location.assign(response.destination);
      } catch {
        setResult({ error: "Connection interrupted. Please try again." });
      }
    });
  if (result.message)
    return (
      <div
        role="status"
        className="space-y-5 rounded-xl border bg-secondary p-6"
      >
        <MailCheck size={30} />
        <p className="leading-7">{result.message}</p>
        <Button asChild variant="outline" className="h-11">
          <Link href="/login">Back to sign in</Link>
        </Button>
      </div>
    );
  const labels = {
    login: "Sign in",
    signup: "Create your account",
    forgot: "Send reset link",
    reset: "Save new password",
  };
  return (
    <div>
      {!configured && (
        <p
          role="status"
          className="mb-6 rounded-lg border border-[#e4cd92] bg-[#fbf1d8] p-4 text-sm leading-6"
        >
          Account services are not connected yet. Registration and sign-in will
          be available once setup is complete.
        </p>
      )}
      {notice && (
        <p
          role="status"
          className="mb-5 rounded-lg bg-secondary p-4 text-sm leading-6"
        >
          {notice}
        </p>
      )}
      {(mode === "login" || mode === "signup") && (
        <>
          <Button
            onClick={oauth}
            disabled={pending || !configured}
            variant="outline"
            className="h-12 w-full gap-3 bg-white"
          >
            <span aria-hidden="true" className="text-lg font-bold">
              G
            </span>
            Continue with Google
          </Button>
          <div className="my-6 flex items-center gap-4 text-xs text-muted-foreground">
            <span className="flex-1 border-t" />
            or continue with email
            <span className="flex-1 border-t" />
          </div>
        </>
      )}
      <form
        onSubmit={submit}
        noValidate
        className="space-y-5"
        aria-busy={pending}
      >
        {mode === "signup" && (
          <Field
            id="full_name"
            label="Full name"
            error={errors.full_name?.message}
          >
            <input
              id="full_name"
              autoComplete="name"
              className={inputClass}
              {...register("full_name")}
              aria-invalid={!!errors.full_name}
              aria-describedby={
                errors.full_name ? "full_name-error" : undefined
              }
            />
          </Field>
        )}
        {mode !== "reset" && (
          <Field id="email" label="Email address" error={errors.email?.message}>
            <input
              id="email"
              type="email"
              autoComplete="email"
              className={inputClass}
              {...register("email")}
              aria-invalid={!!errors.email}
              aria-describedby={errors.email ? "email-error" : undefined}
            />
          </Field>
        )}
        {mode !== "forgot" && (
          <Field
            id="password"
            label={mode === "reset" ? "New password" : "Password"}
            error={errors.password?.message}
            hint={
              mode === "login"
                ? undefined
                : "At least 10 characters. A memorable phrase works well."
            }
          >
            <input
              id="password"
              type="password"
              autoComplete={
                mode === "login" ? "current-password" : "new-password"
              }
              className={inputClass}
              {...register("password")}
              aria-invalid={!!errors.password}
              aria-describedby={
                errors.password
                  ? "password-error"
                  : mode === "login"
                    ? undefined
                    : "password-hint"
              }
            />
          </Field>
        )}
        {mode === "reset" && (
          <Field
            id="confirm"
            label="Confirm new password"
            error={errors.confirm?.message}
          >
            <input
              id="confirm"
              type="password"
              autoComplete="new-password"
              className={inputClass}
              {...register("confirm")}
              aria-invalid={!!errors.confirm}
              aria-describedby={errors.confirm ? "confirm-error" : undefined}
            />
          </Field>
        )}
        {mode === "login" && (
          <Link
            href="/forgot-password"
            className="inline-block text-sm underline underline-offset-4"
          >
            Forgot your password?
          </Link>
        )}
        {result.error && (
          <p
            role="alert"
            className="rounded-lg bg-red-50 p-3 text-sm text-destructive"
          >
            {result.error}
          </p>
        )}
        <Button
          disabled={pending || !configured}
          className="h-12 w-full"
          type="submit"
        >
          {pending ? <LoaderCircle className="animate-spin" /> : <ArrowRight />}
          {pending ? "Please wait…" : labels[mode]}
        </Button>
        {mode === "signup" && (
          <p className="text-xs leading-6 text-muted-foreground">
            By creating an account, you agree to our{" "}
            <Link href="/terms" className="underline">
              Terms
            </Link>{" "}
            and acknowledge our{" "}
            <Link href="/privacy" className="underline">
              Privacy information
            </Link>
            .
          </p>
        )}
      </form>
      <p className="mt-7 text-center text-sm text-muted-foreground">
        {mode === "login" ? (
          <>
            New to the community?{" "}
            <Link
              className="font-medium text-primary underline underline-offset-4"
              href="/signup"
            >
              Join Hunar Souq
            </Link>
          </>
        ) : mode === "signup" ? (
          <>
            Already a member?{" "}
            <Link
              className="font-medium text-primary underline underline-offset-4"
              href="/login"
            >
              Sign in
            </Link>
          </>
        ) : (
          <Link href="/login" className="underline underline-offset-4">
            Back to sign in
          </Link>
        )}
      </p>
      {mode === "reset" && (
        <Link
          href="/forgot-password"
          className="mt-4 block text-center text-sm underline"
        >
          Request a fresh reset link
        </Link>
      )}
    </div>
  );
}

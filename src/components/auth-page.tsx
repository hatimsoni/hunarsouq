import { ShieldCheck, Flower2 } from "lucide-react";
import { Container, Section } from "./layout";
import { AuthForm, type AuthMode } from "./auth-form";
import { getSupabaseEnv } from "@/lib/supabase/env";
import { safeNext } from "@/lib/validation";
const copy = {
  login: [
    "Welcome back.",
    "Your community is right here. Sign in to pick up where you left off.",
  ],
  signup: [
    "Your hunar belongs here.",
    "Create your free account. A new chapter for your skills starts here.",
  ],
  forgot: [
    "Let’s get you back in.",
    "Enter your account email and we’ll send you a password reset link.",
  ],
  reset: ["A fresh start.", "Choose a new password to keep your account safe."],
};
const notices: Record<string, string> = {
  "link-expired":
    "That link is invalid or has expired. Try signing in, or request a new password reset link.",
  "password-updated":
    "Your password has been updated. Sign in with your new password.",
  "reset-required": "Open the link from your password reset email to continue.",
  unavailable: "Account services are not configured yet.",
};
export function AuthPage({
  mode,
  next,
  notice,
}: {
  mode: AuthMode;
  next?: string;
  notice?: string;
}) {
  return (
    <Section className="hero-paper">
      <Container className="grid items-center gap-12 lg:grid-cols-2">
        <div className="hidden max-w-md lg:block">
          <Flower2
            size={65}
            strokeWidth={0.8}
            className="mb-8 text-[#8b9b6d]"
          />
          <p className="eyebrow mb-5">People. Passion. Possibilities.</p>
          <h2 className="text-5xl leading-tight">
            A place for your skill.
            <br />
            <span className="italic text-[#377553]">Room for your growth.</span>
          </h2>
          <p className="mt-6 leading-7 text-muted-foreground">
            Meet people who value what you do. Share your story, show your work,
            and let your hunar find its people.
          </p>
          <p className="mt-8 flex items-center gap-2 text-sm">
            <ShieldCheck size={20} />
            Free to join. Reviewed with care.
          </p>
        </div>
        <div className="mx-auto w-full max-w-lg rounded-2xl border bg-background p-6 shadow-sm sm:p-10">
          <p className="eyebrow mb-3">Welcome to Hunar Souq</p>
          <h1 className="text-3xl leading-tight">{copy[mode][0]}</h1>
          <p className="mb-7 mt-3 text-sm leading-6 text-muted-foreground">
            {copy[mode][1]}
          </p>
          <AuthForm
            mode={mode}
            configured={!!getSupabaseEnv()}
            next={safeNext(next)}
            notice={
              notice && Object.hasOwn(notices, notice)
                ? notices[notice]
                : undefined
            }
          />
        </div>
      </Container>
    </Section>
  );
}

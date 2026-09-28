"use server";
import { createClient } from "@/lib/supabase/server";
import { getSupabaseEnv } from "@/lib/supabase/env";
import { siteOrigin } from "@/lib/auth";
import {
  loginSchema,
  signupSchema,
  forgotSchema,
  resetSchema,
  safeNext,
} from "@/lib/validation";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

export type AuthResult = {
  error?: string;
  message?: string;
  destination?: string;
};
export async function authenticate(
  mode: "login" | "signup" | "forgot" | "reset",
  input: unknown,
  next?: string,
): Promise<AuthResult> {
  if (!getSupabaseEnv())
    return {
      error:
        "Account services are not connected yet. Please try again once setup is complete.",
    };
  try {
    const supabase = await createClient();
    if (mode === "login") {
      const parsed = loginSchema.safeParse(input);
      if (!parsed.success)
        return { error: "Enter a valid email and password." };
      const { error } = await supabase.auth.signInWithPassword(parsed.data);
      if (error)
        return {
          error:
            "Unable to sign in. Check your details and confirm your email, or try again later.",
        };
      revalidatePath("/account", "layout");
      return { destination: safeNext(next) };
    }
    if (mode === "signup") {
      const parsed = signupSchema.safeParse(input);
      if (!parsed.success) return { error: parsed.error.issues[0].message };
      const { email, password, full_name } = parsed.data;
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { full_name },
          emailRedirectTo: `${siteOrigin()}/auth/callback?next=/account/submit`,
        },
      });
      if (error)
        return {
          error:
            "Unable to create your account right now. Please try again later or sign in if you already have an account.",
        };
      if (data.session) return { destination: "/account/submit" };
      return {
        message:
          "Check your inbox to confirm your email. If you already have an account, you can sign in or reset your password.",
      };
    }
    if (mode === "forgot") {
      const parsed = forgotSchema.safeParse(input);
      if (!parsed.success) return { error: parsed.error.issues[0].message };
      // Same response whether or not the address is registered.
      await supabase.auth.resetPasswordForEmail(parsed.data.email, {
        redirectTo: `${siteOrigin()}/auth/callback?next=/reset-password`,
      });
      return {
        message:
          "If an account exists for that address, you’ll receive a password reset link shortly. Check your spam folder too.",
      };
    }
    if (mode === "reset") {
      const parsed = resetSchema.safeParse(input);
      if (!parsed.success) return { error: parsed.error.issues[0].message };
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user)
        return {
          error:
            "Your reset session has expired. Request a new password reset link.",
        };
      const { error } = await supabase.auth.updateUser({
        password: parsed.data.password,
      });
      if (error)
        return {
          error:
            "Unable to update your password. Choose a different password or request a new reset link.",
        };
      await supabase.auth.signOut({ scope: "global" });
      return { destination: "/login?notice=password-updated" };
    }
    return { error: "Invalid request." };
  } catch {
    return {
      error:
        "We could not reach account services. Please try again in a moment.",
    };
  }
}
export async function googleSignIn(): Promise<AuthResult> {
  if (!getSupabaseEnv())
    return { error: "Account services are not connected yet." };
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${siteOrigin()}/auth/callback?next=/account`,
        skipBrowserRedirect: true,
      },
    });
    if (error || !data.url)
      return {
        error: "Google sign-in is unavailable. Please try again or use email.",
      };
    return { destination: data.url };
  } catch {
    return { error: "Google sign-in is unavailable. Please try again later." };
  }
}
export async function signOut() {
  if (getSupabaseEnv()) {
    const supabase = await createClient();
    const { error } = await supabase.auth.signOut();
    if (error) throw new Error("Unable to sign out. Please try again.");
  }
  revalidatePath("/account", "layout");
  redirect("/login");
}

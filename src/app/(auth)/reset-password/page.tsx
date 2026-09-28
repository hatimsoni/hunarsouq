import { AuthPage } from "@/components/auth-page";
import { createClient } from "@/lib/supabase/server";
import { getSupabaseEnv } from "@/lib/supabase/env";
import { redirect } from "next/navigation";
export const metadata = { title: "Choose a new password" };
export default async function Reset() {
  if (getSupabaseEnv()) {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) redirect("/forgot-password?notice=reset-required");
  }
  return <AuthPage mode="reset" />;
}

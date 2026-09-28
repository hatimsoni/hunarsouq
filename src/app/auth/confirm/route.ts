import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getSupabaseEnv } from "@/lib/supabase/env";
import { siteOrigin } from "@/lib/auth";

export async function GET(request: NextRequest) {
  if (!getSupabaseEnv())
    return NextResponse.redirect(
      new URL("/login?notice=unavailable", request.url),
    );
  const token_hash = request.nextUrl.searchParams.get("token_hash");
  const type = request.nextUrl.searchParams.get("type");
  let destination = "/login?notice=link-expired";
  if (
    token_hash &&
    (type === "signup" || type === "email" || type === "recovery") &&
    getSupabaseEnv()
  ) {
    const supabase = await createClient();
    const { error } = await supabase.auth.verifyOtp({ token_hash, type });
    if (!error)
      destination = type === "recovery" ? "/reset-password" : "/account/submit";
  }
  return NextResponse.redirect(new URL(destination, siteOrigin()), {
    headers: { "Cache-Control": "private, no-store" },
  });
}

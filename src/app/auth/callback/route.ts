import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getSupabaseEnv } from "@/lib/supabase/env";
import { safeNext } from "@/lib/validation";
import { siteOrigin } from "@/lib/auth";

export async function GET(request: NextRequest) {
  if (!getSupabaseEnv())
    return NextResponse.redirect(
      new URL("/login?notice=unavailable", request.url),
    );
  const code = request.nextUrl.searchParams.get("code");
  const origin = siteOrigin();
  let destination = "/login?notice=link-expired";
  if (code && getSupabaseEnv()) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error)
      destination =
        request.nextUrl.searchParams.get("next") === "/reset-password"
          ? "/reset-password"
          : safeNext(request.nextUrl.searchParams.get("next"));
  }
  return NextResponse.redirect(new URL(destination, origin), {
    headers: { "Cache-Control": "private, no-store" },
  });
}

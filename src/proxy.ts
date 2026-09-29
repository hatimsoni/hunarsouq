import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseEnv } from "@/lib/supabase/env";
import type { Database } from "@/lib/supabase/database.types";
import { safeNext } from "@/lib/validation";

export async function proxy(request: NextRequest) {
  const env = getSupabaseEnv();
  let response = NextResponse.next({ request });
  const protectedRoute =
    request.nextUrl.pathname === "/account" ||
    request.nextUrl.pathname.startsWith("/account/") ||
    request.nextUrl.pathname === "/admin" ||
    request.nextUrl.pathname.startsWith("/admin/");
  const login = () => {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = "";
    url.searchParams.set("next", safeNext(request.nextUrl.pathname));
    const result = NextResponse.redirect(url);
    response.cookies.getAll().forEach((cookie) => result.cookies.set(cookie));
    result.headers.set("Cache-Control", "private, no-store");
    return result;
  };
  if (!env) return protectedRoute ? login() : response;
  const supabase = createServerClient<Database>(env.url, env.key, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll(values) {
        values.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        values.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options),
        );
      },
    },
  });
  const { data, error } = await supabase.auth.getUser();
  if (protectedRoute && (error || !data.user)) return login();
  if (data.user && ["/login", "/signup"].includes(request.nextUrl.pathname)) {
    const target = request.nextUrl.clone();
    target.pathname = safeNext(request.nextUrl.searchParams.get("next"));
    target.search = "";
    const result = NextResponse.redirect(target);
    response.cookies.getAll().forEach((cookie) => result.cookies.set(cookie));
    result.headers.set("Cache-Control", "private, no-store");
    return result;
  }
  response.headers.set("Cache-Control", "private, no-store");
  return response;
}
export const config = {
  matcher: [
    "/account/:path*",
    "/admin/:path*",
    "/login",
    "/signup",
    "/forgot-password",
    "/reset-password",
    "/auth/:path*",
  ],
};

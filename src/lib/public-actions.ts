import "server-only";
import { createHmac } from "node:crypto";
import { isIP } from "node:net";
import { headers } from "next/headers";
import { createClient } from "@supabase/supabase-js";
import { getSupabaseEnv } from "./supabase/env";
import type { Database } from "./supabase/database.types";
export async function publicActionContext() {
  const env = getSupabaseEnv();
  const secret = process.env.PUBLIC_ACTION_SECRET;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!env || !key || !secret || secret.length < 32) return null;
  // Configure only a header your ingress overwrites, with direct origin access blocked.
  // Without a trusted header, all visitors share a conservative global quota.
  const header = process.env.PUBLIC_ACTION_IP_HEADER;
  const value = header ? (await headers()).get(header)?.trim() : null;
  let identity = "shared";
  if (value && isIP(value))
    identity = value.includes(":")
      ? new URL(`http://[${value}]/`).hostname
      : value;
  const visitor_key = createHmac("sha256", secret)
    .update(identity)
    .digest("hex");
  const db = createClient<Database>(env.url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: {
      fetch: (input, init) =>
        fetch(input, {
          ...init,
          cache: "no-store",
          signal: AbortSignal.timeout(10000),
        }),
    },
  });
  return { db, visitor_key };
}

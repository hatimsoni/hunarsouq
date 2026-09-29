import "server-only";
import { cache } from "react";
import { notFound } from "next/navigation";
import { requireUser } from "./auth";
export const requireAdmin = cache(async () => {
  const session = await requireUser();
  const { data, error } = await session.supabase.rpc("is_admin");
  if (error || !data) notFound();
  return session;
});

"use server";
import { z } from "zod";
import { revalidatePath, updateTag } from "next/cache";
import { requireUser } from "@/lib/auth";
import {
  businessSchema,
  draftBusinessSchema,
  workSchema,
} from "@/lib/business-validation";
import { uploadMemberImage } from "@/lib/member-media";
function invalidate() {
  revalidatePath("/account", "layout");
  revalidatePath("/business", "layout");
  revalidatePath("/admin", "layout");
  updateTag("home");
  revalidatePath("/");
}
function saveError(error: { code?: string; message?: string }) {
  if (error.code === "23505")
    return "That business address is taken. Choose a different URL name.";
  if (error.message?.includes("at most five"))
    return "You can add five businesses and work experiences combined. Remove an item first.";
  if (error.code === "42501")
    return "This item cannot be changed. Check your account and review status.";
  return "Could not save. Check your fields and images, then try again.";
}
export async function saveBusiness(
  input: unknown,
  intent: "draft" | "submit",
  id?: string,
  revision?: string,
) {
  const { supabase, user } = await requireUser();
  if (
    !["draft", "submit"].includes(intent) ||
    (id && !z.string().uuid().safeParse(id).success)
  )
    return { error: "Invalid save request." };
  const parsed = (
    intent === "submit" ? businessSchema : draftBusinessSchema
  ).safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const value = parsed.data;
  if (
    [...value.photos, ...(value.logo ? [value.logo] : [])].some(
      (p) => !p.startsWith(`${user.id}/`),
    )
  )
    return { error: "Upload your own business images through this form." };
  const row = {
    ...value,
    logo: value.logo || null,
    status: intent === "submit" ? ("pending" as const) : ("draft" as const),
  };
  const query = id
    ? supabase
        .from("businesses")
        .update(row)
        .eq("id", id)
        .eq("owner_id", user.id)
        .eq("updated_at", revision ?? "")
    : supabase.from("businesses").insert({ ...row, owner_id: user.id });
  const { data, error } = await query
    .select("id,updated_at,status")
    .maybeSingle();
  if (error) return { error: saveError(error) };
  if (!data)
    return {
      error: "This business changed in another tab. Reload before saving.",
    };
  invalidate();
  return { id: data.id, revision: data.updated_at, status: data.status };
}
export async function saveWork(input: unknown, id?: string, revision?: string) {
  const { supabase, user } = await requireUser();
  const parsed = workSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  if (id && !z.string().uuid().safeParse(id).success)
    return { error: "Invalid work entry." };
  const row = { ...parsed.data, end_date: parsed.data.end_date || null };
  const query = id
    ? supabase
        .from("work_experiences")
        .update(row)
        .eq("id", id)
        .eq("profile_id", user.id)
        .eq("updated_at", revision ?? "")
    : supabase.from("work_experiences").insert({ ...row, profile_id: user.id });
  const { data, error } = await query.select("id,updated_at").maybeSingle();
  if (error) return { error: saveError(error) };
  if (!data)
    return {
      error: "This work entry changed in another tab. Reload before saving.",
    };
  invalidate();
  return { id: data.id, revision: data.updated_at };
}
export async function deleteWorkItem(
  kind: "business" | "experience",
  id: string,
  revision: string,
) {
  const { supabase, user } = await requireUser();
  if (
    !["business", "experience"].includes(kind) ||
    !z.string().uuid().safeParse(id).success ||
    !z.iso.datetime({ offset: true }).safeParse(revision).success
  )
    return { error: "Invalid item." };
  const query =
    kind === "business"
      ? supabase.from("businesses").delete().eq("owner_id", user.id)
      : supabase.from("work_experiences").delete().eq("profile_id", user.id);
  const { data, error } = await query
    .eq("id", id)
    .eq("updated_at", revision)
    .select("id")
    .maybeSingle();
  if (error)
    return {
      error:
        "This item cannot be removed. Check your account and review status.",
    };
  if (!data) return { error: "This item changed. Reload before removing it." };
  invalidate();
  return { success: true };
}
export async function uploadBusinessImage(form: FormData) {
  return uploadMemberImage(form, "business-media");
}

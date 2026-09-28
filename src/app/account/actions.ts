"use server";
import { randomUUID } from "node:crypto";
import sharp from "sharp";
import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import {
  profileSchema,
  draftProfileSchema,
  usernameSchema,
} from "@/lib/validation";
import type { Profile } from "@/lib/supabase/database.types";

export async function checkUsername(
  value: string,
): Promise<{ available?: boolean; error?: string }> {
  const parsed = usernameSchema.safeParse(value);
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const { supabase } = await requireUser();
  const { data, error } = await supabase.rpc("username_available", {
    candidate: parsed.data,
  });
  return error
    ? { error: "Unable to check this username right now." }
    : { available: data };
}
export async function saveProfile(
  input: unknown,
  intent: "draft" | "submit",
  revision: string,
): Promise<{ error?: string; revision?: string; status?: Profile["status"] }> {
  const { supabase, user } = await requireUser();
  if (intent !== "draft" && intent !== "submit")
    return { error: "Invalid save request." };
  const parsed = (
    intent === "submit" ? profileSchema : draftProfileSchema
  ).safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const value = parsed.data;
  const paths = [
    ...value.portfolio_images,
    ...(value.photo_url ? [value.photo_url] : []),
  ];
  if (
    paths.some(
      (path) => !new RegExp(`^${user.id}/[0-9a-f-]+\\.webp$`).test(path),
    )
  )
    return { error: "Please upload your images through this form." };
  const { data, error } = await supabase
    .from("profiles")
    .update({
      ...value,
      username: value.username || null,
      category_id: value.category_id || null,
      photo_url: value.photo_url || null,
      sub_skills: [
        ...new Set(
          value.sub_skills
            .split(",")
            .map((skill) => skill.trim())
            .filter(Boolean),
        ),
      ],
      status: intent === "submit" ? "pending" : "draft",
    })
    .eq("id", user.id)
    .eq("updated_at", revision)
    .select("updated_at,status")
    .maybeSingle();
  if (error)
    return {
      error:
        error.code === "23505"
          ? "That username was just taken. Please choose another."
          : error.code === "23514"
            ? "Check the required fields and uploaded images before saving."
            : "Your profile could not be saved. Please try again.",
    };
  if (!data)
    return {
      error:
        "Your profile changed in another tab. Reload this page before saving to avoid overwriting it.",
    };
  revalidatePath("/account", "layout");
  return { revision: data.updated_at, status: data.status };
}
export async function uploadProfileImage(
  form: FormData,
): Promise<{ path?: string; url?: string; error?: string }> {
  const { supabase, user } = await requireUser();
  const file = form.get("file");
  if (
    !(file instanceof File) ||
    file.type !== "image/webp" ||
    file.size > 2 * 1024 * 1024 ||
    file.size === 0
  )
    return { error: "Choose a WebP image under 2 MB." };
  try {
    const source = sharp(Buffer.from(await file.arrayBuffer()), {
      limitInputPixels: 20_000_000,
      animated: false,
    });
    const metadata = await source.metadata();
    if (
      metadata.format !== "webp" ||
      !metadata.width ||
      !metadata.height ||
      (metadata.pages ?? 1) > 1
    )
      return { error: "Please choose a still image." };
    const buffer = await source
      .rotate()
      .resize(1600, 1600, { fit: "inside", withoutEnlargement: true })
      .webp({ quality: 82 })
      .toBuffer();
    if (buffer.length > 2 * 1024 * 1024)
      return { error: "This image is too large. Try a smaller image." };
    const path = `${user.id}/${randomUUID()}.webp`;
    const { error } = await supabase.storage
      .from("profile-media")
      .upload(path, buffer, { contentType: "image/webp", upsert: false });
    if (error) return { error: "Upload failed. Please try again." };
    const { data, error: signError } = await supabase.storage
      .from("profile-media")
      .createSignedUrl(path, 3600);
    if (signError)
      return {
        error:
          "The image was uploaded but its preview is unavailable. Please try again.",
      };
    return { path, url: data.signedUrl };
  } catch {
    return {
      error:
        "We could not process this image. Choose a different JPG, PNG, or WebP file.",
    };
  }
}

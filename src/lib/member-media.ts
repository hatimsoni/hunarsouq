import "server-only";
import { randomUUID } from "node:crypto";
import sharp from "sharp";
import { requireUser } from "./auth";
export async function uploadMemberImage(
  form: FormData,
  bucket: "profile-media" | "business-media",
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
      .from(bucket)
      .upload(path, buffer, { contentType: "image/webp", upsert: false });
    if (error) return { error: "Upload failed. Please try again." };
    const { data, error: signError } = await supabase.storage
      .from(bucket)
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

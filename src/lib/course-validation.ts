import { z } from "zod";

const safeHttps = z.string().trim().max(800).refine((value) => {
  if (!value) return true;
  try { return new URL(value).protocol === "https:"; } catch { return false; }
}, "Use a complete HTTPS link.");

export const courseSchema = z.object({
  title: z.string().trim().min(3).max(140),
  slug: z.string().trim().regex(/^[a-z][a-z0-9-]{2,100}$/),
  category_id: z.string().uuid(),
  thumbnail: safeHttps,
  short_description: z.string().trim().min(20).max(240),
  description: z.string().trim().min(40).max(20000),
  level: z.enum(["beginner", "intermediate", "advanced"]),
  language: z.string().trim().min(2).max(60),
  duration_text: z.string().trim().min(2).max(80),
  price: z.coerce.number().int().min(0).max(10000000),
});

export const moduleSchema = z.object({
  course_id: z.string().uuid(),
  title: z.string().trim().min(2).max(140),
  sort_order: z.coerce.number().int().min(0).max(1000),
});

export const lessonSchema = z.object({
  module_id: z.string().uuid(),
  title: z.string().trim().min(2).max(140),
  type: z.enum(["video", "text", "pdf"]),
  video_url: safeHttps,
  content: z.string().max(30000),
  attachment_url: safeHttps,
  duration_minutes: z.coerce.number().int().min(0).max(600),
  is_preview: z.boolean(),
  sort_order: z.coerce.number().int().min(0).max(1000),
}).refine((v) => v.type !== "video" || Boolean(v.video_url), {
  path: ["video_url"], message: "Add a video link for video lessons.",
});

export function courseSlug(value: string) {
  return value.trim().toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 100);
}

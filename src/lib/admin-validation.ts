import { z } from "zod";
export const categoryIcons = [
  "Scissors",
  "CookingPot",
  "Ruler",
  "Scale",
  "CodeXml",
  "Cog",
  "BookOpen",
  "Store",
  "HeartPulse",
  "Calculator",
  "Megaphone",
  "House",
  "Wrench",
  "Plane",
  "Palette",
  "Camera",
  "Gem",
] as const;
export const reviewSchema = z
  .object({
    profile_id: z.string().uuid(),
    revision: z.string().datetime({ offset: true }),
    decision: z.enum([
      "approve",
      "reject",
      "request_changes",
      "suspend",
      "restore",
    ]),
    note: z.string().trim().max(2000),
  })
  .refine(
    (value) =>
      !["reject", "request_changes", "suspend"].includes(value.decision) ||
      value.note.length >= 5,
    {
      path: ["note"],
      message: "Explain this decision in at least 5 characters.",
    },
  );
export const categorySchema = z.object({
  id: z.union([z.literal(""), z.string().uuid()]),
  revision: z.string(),
  name: z.string().trim().min(1, "Enter a category name.").max(100),
  slug: z
    .string()
    .trim()
    .min(1)
    .max(80)
    .regex(
      /^[a-z0-9]+(-[a-z0-9]+)*$/,
      "Use lowercase words separated by hyphens.",
    ),
  description: z.string().trim().max(250),
  icon: z.enum(categoryIcons),
});
export const orderSchema = z.object({
  ids: z.array(z.string().uuid()).min(1).max(1000),
  expected: z.array(z.string().uuid()).min(1).max(1000),
});
export function safeExternalLink(value: unknown): string | null {
  if (typeof value !== "string") return null;
  try {
    const url = new URL(value);
    return url.protocol === "https:" && !url.username && !url.password
      ? url.href
      : null;
  } catch {
    return null;
  }
}
export function verificationWhatsApp(
  number: string,
  name: string,
): string | null {
  if (!/^\+[1-9]\d{7,14}$/.test(number)) return null;
  return `https://wa.me/${number.slice(1)}?text=${encodeURIComponent(`Hello ${name}, this is the Hunar Souq review team. We’re reviewing your profile and would like to confirm a few details about your work. Is this a good time?`)}`;
}
export function parsePage(value: string | undefined) {
  const number = Number(value);
  return Number.isInteger(number) && number > 0 ? Math.min(number, 10000) : 1;
}
export function searchTerm(value: string | undefined) {
  return (value ?? "")
    .trim()
    .replace(/[^\p{L}\p{N} _-]/gu, "")
    .slice(0, 80);
}

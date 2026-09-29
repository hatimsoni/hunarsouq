import { z } from "zod";
import { safeExternalLink } from "./admin-validation";
export const businessTypes = {
  home_business: "Home business",
  shop: "Shop",
  service: "Professional service",
  studio: "Studio",
  online: "Online business",
  other: "Other",
} as const;
export const businessTypeSchema = z.enum([
  "home_business",
  "shop",
  "service",
  "studio",
  "online",
  "other",
]);
const phone = z
  .string()
  .trim()
  .regex(
    /^$|^\+[1-9]\d{7,14}$/,
    "Use international format, such as +919876543210.",
  );
const link = z
  .string()
  .trim()
  .max(700)
  .refine(
    (value) => !value || !!safeExternalLink(value),
    "Enter a full https:// URL without login details.",
  );
const path = z
  .string()
  .regex(
    /^[0-9a-f-]{36}\/[0-9a-f-]{36}\.webp$/,
    "Upload images through this form.",
  );
const baseBusiness = z.object({
  name: z.string().trim().min(2, "Enter a business name.").max(100),
  slug: z
    .string()
    .trim()
    .regex(
      /^[a-z][a-z0-9-]{2,79}$/,
      "Use 3â€“80 lowercase letters, numbers or hyphens, starting with a letter.",
    ),
  type: businessTypeSchema,
  description: z.string().trim().max(3000),
  city: z.string().trim().max(100),
  address: z.string().trim().max(300),
  phone,
  whatsapp: phone,
  email: z.union([z.literal(""), z.string().trim().email().max(254)]),
  website: link,
  instagram: link,
  show_call: z.boolean(),
  show_email: z.boolean(),
  logo: z.union([z.literal(""), path]),
  photos: z.array(path).max(6),
});
const preferences = (
  value: z.infer<typeof baseBusiness>,
  ctx: z.RefinementCtx,
) => {
  if (value.show_call && !value.phone)
    ctx.addIssue({
      code: "custom",
      path: ["phone"],
      message: "Add a phone number or turn off calls.",
    });
  if (value.show_email && !value.email)
    ctx.addIssue({
      code: "custom",
      path: ["email"],
      message: "Add an email address or turn off email.",
    });
};
export const draftBusinessSchema = baseBusiness.superRefine(preferences);
export const businessSchema = baseBusiness
  .extend({
    description: z
      .string()
      .trim()
      .min(30, "Tell visitors about your business in at least 30 characters.")
      .max(3000),
    city: z.string().trim().min(1, "Enter your city.").max(100),
  })
  .superRefine(preferences);
export type BusinessInput = z.infer<typeof baseBusiness>;
export const emptyBusiness: BusinessInput = {
  name: "",
  slug: "",
  type: "home_business",
  description: "",
  city: "",
  address: "",
  phone: "",
  whatsapp: "",
  email: "",
  website: "",
  instagram: "",
  show_call: false,
  show_email: false,
  logo: "",
  photos: [],
};
const date = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Choose a valid date.")
  .refine((value) => {
    const d = new Date(value + "T00:00:00Z");
    return (
      !Number.isNaN(d.getTime()) &&
      d.toISOString().slice(0, 10) === value &&
      value >= "1900-01-01" &&
      value <= new Date().toISOString().slice(0, 10)
    );
  }, "Choose a real date between 1900 and today.");
export const workSchema = z
  .object({
    title: z.string().trim().min(2).max(120),
    organisation: z.string().trim().min(2).max(120),
    start_date: date,
    end_date: z.union([z.literal(""), date]),
    description: z.string().trim().max(2000),
  })
  .refine((v) => !v.end_date || v.end_date >= v.start_date, {
    path: ["end_date"],
    message: "The end date cannot be before the start date.",
  });
export type WorkInput = z.infer<typeof workSchema>;
export function businessFilters(
  params: Record<string, string | string[] | undefined>,
) {
  const one = (key: string) =>
    typeof params[key] === "string" ? params[key].trim().slice(0, 100) : "";
  const type = one("type");
  const page = Number(one("page"));
  return {
    q: one("q"),
    type: Object.hasOwn(businessTypes, type) ? type : "",
    city: one("city"),
    page: Number.isInteger(page) && page > 0 ? Math.min(page, 10000) : 1,
  };
}
export function businessHref(
  filters: ReturnType<typeof businessFilters>,
  page: number,
) {
  const query = new URLSearchParams();
  for (const k of ["q", "type", "city"] as const)
    if (filters[k]) query.set(k, filters[k]);
  if (page > 1) query.set("page", String(page));
  return "/business" + (query.size ? "?" + query : "");
}

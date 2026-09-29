import { z } from "zod";

export const reservedUsernames = new Set([
  "about",
  "privacy",
  "terms",
  "guidelines",
  "contact",
  "signup",
  "login",
  "logout",
  "forgot-password",
  "reset-password",
  "hunar",
  "business",
  "courses",
  "account",
  "admin",
  "auth",
  "api",
  "learn",
  "verify",
  "settings",
  "support",
  "help",
  "www",
  "sitemap",
  "robots",
  "favicon",
  "constructor",
  "prototype",
  "__proto__",
]);
export const usernameSchema = z
  .string()
  .trim()
  .regex(
    /^[a-z][a-z0-9_]{2,29}$/,
    "Use 3–30 lowercase letters, numbers, or underscores; start with a letter.",
  )
  .refine(
    (value) => !reservedUsernames.has(value),
    "This username is reserved.",
  );
export const passwordSchema = z
  .string()
  .min(10, "Use at least 10 characters.")
  .max(128, "Use at most 128 characters.");
export const emailSchema = z
  .string()
  .trim()
  .email("Enter a valid email address.")
  .max(254);
export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Enter your password.").max(128),
});
export const signupSchema = loginSchema.extend({
  full_name: z.string().trim().min(2, "Enter your full name.").max(100),
  password: passwordSchema,
});
export const forgotSchema = z.object({ email: emailSchema });
export const resetSchema = z
  .object({ password: passwordSchema, confirm: z.string() })
  .refine((value) => value.password === value.confirm, {
    path: ["confirm"],
    message: "Passwords must match.",
  });
const phone = z
  .string()
  .regex(
    /^$|^\+[1-9]\d{7,14}$/,
    "Use international format, for example +919876543210.",
  );
const link = z.union([
  z.literal(""),
  z
    .string()
    .url("Enter a full https:// URL.")
    .max(700)
    .refine((value) => {
      try {
        const url = new URL(value);
        return url.protocol === "https:" && !url.username && !url.password;
      } catch {
        return false;
      }
    }, "Use a secure https:// link without credentials."),
]);
export const linksSchema = z.object({
  instagram: link,
  website: link,
  portfolio: link,
  youtube: link,
  linkedin: link,
});
export const profileSchema = z
  .object({
    full_name: z
      .string()
      .trim()
      .min(2, "Enter at least two characters.")
      .max(100),
    username: usernameSchema,
    photo_url: z.string().max(200),
    category_id: z.string().uuid("Choose a skill category."),
    sub_skills: z
      .string()
      .max(600)
      .refine(
        (value) => value.split(",").filter((s) => s.trim()).length <= 12,
        "Add up to 12 sub-skills.",
      )
      .refine(
        (value) => value.split(",").every((s) => s.trim().length <= 50),
        "Keep each sub-skill under 50 characters.",
      ),
    bio: z
      .string()
      .trim()
      .min(30, "Tell us a little more (at least 30 characters).")
      .max(2000),
    city: z.string().trim().min(1, "Enter your city.").max(100),
    state: z.string().trim().max(100),
    country: z.string().trim().min(1, "Enter your country.").max(100),
    years_experience: z.number().int().min(0).max(80),
    availability: z.enum(["available", "busy", "not_taking_work"]),
    phone,
    whatsapp: phone,
    email_public: z.union([z.literal(""), emailSchema]),
    show_call: z.boolean(),
    show_email: z.boolean(),
    links: linksSchema,
    portfolio_images: z.array(z.string().min(1).max(200)).max(6),
  })
  .superRefine((value, ctx) => {
    if (value.show_call && !value.phone)
      ctx.addIssue({
        code: "custom",
        path: ["phone"],
        message: "Add a phone number or turn off calls.",
      });
    if (value.show_email && !value.email_public)
      ctx.addIssue({
        code: "custom",
        path: ["email_public"],
        message: "Add an email address or turn off email contact.",
      });
  });
export type ProfileInput = z.infer<typeof profileSchema>;
export const draftProfileSchema = profileSchema.safeExtend({
  full_name: z.string().trim().max(100),
  username: z.union([z.literal(""), usernameSchema]),
  category_id: z.union([z.literal(""), z.string().uuid()]),
  bio: z.string().trim().max(2000),
  city: z.string().trim().max(100),
  country: z.string().trim().max(100),
});
export const emptyProfile: ProfileInput = {
  full_name: "",
  username: "",
  photo_url: "",
  category_id: "",
  sub_skills: "",
  bio: "",
  city: "",
  state: "",
  country: "India",
  years_experience: 0,
  availability: "available",
  phone: "",
  whatsapp: "",
  email_public: "",
  show_call: false,
  show_email: false,
  links: {
    instagram: "",
    website: "",
    portfolio: "",
    youtube: "",
    linkedin: "",
  },
  portfolio_images: [],
};
export function safeNext(value: string | null | undefined) {
  if (value === "/admin" || value?.startsWith("/admin/")) return "/admin";
  return value === "/account/submit" ? value : "/account";
}

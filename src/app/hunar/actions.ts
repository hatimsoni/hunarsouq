"use server";
import { z } from "zod";
import { publicActionContext } from "@/lib/public-actions";
const contacts = z.object({
  phone: z.string(),
  whatsapp: z.string(),
  email: z.string(),
});
export async function revealContact(id: string) {
  if (!z.string().uuid().safeParse(id).success)
    return { error: "Profile unavailable." };
  try {
    const context = await publicActionContext();
    if (!context)
      return { error: "Contact options are temporarily unavailable." };
    const { data, error } = await context.db.rpc("reveal_profile_contact", {
      target_id: id,
      visitor_key: context.visitor_key,
    });
    if (error) return { error: "Contact options are temporarily unavailable." };
    const parsed = contacts.safeParse(data);
    if (parsed.success) return { contact: parsed.data };
    const failure = z.object({ error: z.string() }).safeParse(data);
    return {
      error: failure.success
        ? failure.data.error
        : "Contact options are temporarily unavailable.",
    };
  } catch {
    return { error: "Contact options are temporarily unavailable." };
  }
}
export async function reportProfile(input: unknown) {
  const parsed = z
    .object({
      id: z.string().uuid(),
      reason: z.enum(["spam", "misleading", "inappropriate", "other"]),
      details: z.string().trim().min(10).max(2000),
    })
    .safeParse(input);
  if (!parsed.success)
    return { error: "Choose a reason and add 10–2000 characters." };
  try {
    const context = await publicActionContext();
    if (!context)
      return {
        error: "Reporting is temporarily unavailable. Please try again later.",
      };
    const { data, error } = await context.db.rpc("report_public_profile", {
      target_id: parsed.data.id,
      visitor_key: context.visitor_key,
      report_reason: parsed.data.reason,
      report_details: parsed.data.details,
    });
    if (
      !error &&
      z.object({ success: z.literal(true) }).safeParse(data).success
    )
      return { success: true };
    const failure = z.object({ error: z.string() }).safeParse(data);
    return {
      error: failure.success
        ? failure.data.error
        : "Could not submit your report. Please try again.",
    };
  } catch {
    return { error: "Could not submit your report. Please try again." };
  }
}

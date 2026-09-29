"use server";
import { z } from "zod";
import { publicActionContext } from "@/lib/public-actions";
export async function revealBusinessContact(id: string) {
  if (!z.string().uuid().safeParse(id).success)
    return { error: "Business unavailable." };
  try {
    const context = await publicActionContext();
    if (!context)
      return { error: "Contact options are temporarily unavailable." };
    const { data, error } = await context.db.rpc("reveal_business_contact", {
      target_id: id,
      visitor_key: context.visitor_key,
    });
    if (error) return { error: "Contact options are temporarily unavailable." };
    const contact = z
      .object({ phone: z.string(), whatsapp: z.string(), email: z.string() })
      .safeParse(data);
    if (contact.success) return { contact: contact.data };
    const result = z.object({ error: z.string() }).safeParse(data);
    return {
      error: result.success
        ? result.data.error
        : "Contact options are temporarily unavailable.",
    };
  } catch {
    return { error: "Contact options are temporarily unavailable." };
  }
}

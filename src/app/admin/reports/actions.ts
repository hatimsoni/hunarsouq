"use server";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/admin";
export async function reviewReport(id: string, decision: string) {
  const { supabase } = await requireAdmin();
  if (
    !z.string().uuid().safeParse(id).success ||
    !["resolved", "dismissed"].includes(decision)
  )
    return { error: "Invalid report decision." };
  const { error } = await supabase.rpc("review_public_report", {
    report_id: id,
    decision,
  });
  if (error)
    return {
      error:
        "Report could not be updated. Refresh to check whether another reviewer handled it.",
    };
  revalidatePath("/admin/reports");
  return { success: true };
}

import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { getSupabaseEnv } from "@/lib/supabase/env";
import type { Database } from "@/lib/supabase/database.types";

export async function verifyRazorpayWebhook(rawBody: string, signature: string | null) {
  const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
  const env = getSupabaseEnv();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!webhookSecret || !env || !key || !signature) return false;
  const service = createSupabaseClient<Database>(env.url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  const expected = createHmac("sha256", webhookSecret).update(rawBody).digest();
  let supplied: Buffer;
  try { supplied = Buffer.from(signature, "hex"); } catch { return false; }
  if (expected.length !== supplied.length || !timingSafeEqual(expected, supplied)) return false;
  let event: { event?: string; payload?: { payment?: { entity?: { id?: string; order_id?: string; amount?: number; currency?: string; status?: string } } } };
  try { event = JSON.parse(rawBody); } catch { return false; }
  if (event.event !== "payment.captured") return true;
  const payment = event.payload?.payment?.entity;
  const orderId = payment?.order_id;
  if (!payment?.id || !orderId || !Number.isSafeInteger(payment.amount) || payment.currency !== "INR" || payment.status !== "captured") return false;
  const { data: record } = await service.from("payments").select("id,user_id,course_id,amount,status").eq("razorpay_order_id", orderId).maybeSingle();
  if (!record || payment.amount !== record.amount * 100) return false;
  const { error } = await service.from("payments").update({ razorpay_payment_id: payment.id, status: "paid", paid_at: new Date().toISOString() }).eq("id", record.id);
  if (error) return false;
  const { error: enrollmentError } = await service.from("enrollments").upsert({ user_id: record.user_id, course_id: record.course_id }, { onConflict: "user_id,course_id" });
  return !enrollmentError;
}

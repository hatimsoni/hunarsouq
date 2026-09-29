import { verifyRazorpayWebhook } from "@/lib/razorpay-webhook";
export const runtime = "nodejs";
export async function POST(request: Request) {
  const rawBody = await request.text();
  if (rawBody.length > 256_000) return Response.json({ error: "Payload too large" }, { status: 413 });
  const ok = await verifyRazorpayWebhook(rawBody, request.headers.get("x-razorpay-signature"));
  return ok ? Response.json({ received: true }) : Response.json({ error: "Invalid payment webhook" }, { status: 400 });
}

import { timingSafeEqual } from "node:crypto";
import { dispatchStatusEmails, emailConfigured } from "@/lib/email-worker";
export const dynamic = "force-dynamic";
export async function POST(request: Request) {
  const secret = process.env.STATUS_EMAIL_WORKER_SECRET;
  const supplied = request.headers.get("authorization") ?? "";
  if (!secret || secret.length < 32)
    return Response.json(
      { error: "Worker is not configured." },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  const expected = Buffer.from(`Bearer ${secret}`);
  const actual = Buffer.from(supplied);
  if (actual.length !== expected.length || !timingSafeEqual(actual, expected))
    return Response.json(
      { error: "Unauthorized" },
      { status: 401, headers: { "Cache-Control": "no-store" } },
    );
  if (!emailConfigured())
    return Response.json(
      { error: "Email delivery is not configured." },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  return Response.json(await dispatchStatusEmails(), {
    headers: { "Cache-Control": "no-store" },
  });
}

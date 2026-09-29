import { test } from "node:test";
import assert from "node:assert/strict";
import {
  reviewSchema,
  categorySchema,
  safeExternalLink,
  verificationWhatsApp,
  searchTerm,
  parsePage,
} from "../../src/lib/admin-validation";
import {
  sendResendEmail,
  statusEmailPayload,
} from "../../src/lib/email-message";
test("review inputs require explanations and allowlisted decisions", () => {
  const review = {
    profile_id: "11111111-1111-4111-8111-111111111111",
    revision: new Date().toISOString(),
    decision: "approve",
    note: "",
  };
  assert.equal(reviewSchema.safeParse(review).success, true);
  for (const decision of ["reject", "request_changes", "suspend"])
    assert.equal(
      reviewSchema.safeParse({ ...review, decision }).success,
      false,
    );
  assert.equal(
    reviewSchema.safeParse({ ...review, decision: "admin" }).success,
    false,
  );
  assert.equal(
    categorySchema.safeParse({
      id: "",
      revision: "",
      name: "Painting",
      slug: "painting",
      description: "",
      icon: "Palette",
    }).success,
    true,
  );
  assert.equal(
    categorySchema.safeParse({
      id: "",
      revision: "",
      name: "Painting",
      slug: "bad/slug",
      description: "",
      icon: "script",
    }).success,
    false,
  );
});
test("review links and search parameters cannot inject scripts or filters", () => {
  for (const url of [
    "javascript:alert(1)",
    "http://example.com",
    "https://name:password@example.com",
    "not a url",
  ])
    assert.equal(safeExternalLink(url), null);
  assert.equal(safeExternalLink("https://example.com"), "https://example.com/");
  assert.equal(verificationWhatsApp("not a phone", "Member"), null);
  assert.match(
    verificationWhatsApp("+919876543210", "A & B")!,
    /^https:\/\/wa.me\/919876543210\?text=/,
  );
  assert.ok(!searchTerm("name),role.eq.admin%").includes(","));
  assert.equal(parsePage("-4"), 1);
  assert.equal(parsePage("Infinity"), 1);
});
test("status email uses private account email and plain text, with safe retries", async () => {
  const payload = statusEmailPayload(
    {
      to_email: "account@example.test",
      full_name: "<script>name</script>",
      new_status: "changes_requested",
      note: "Please clarify <b>your work</b>.",
    },
    "Hunar Souq <review@example.test>",
    "https://example.test",
  );
  assert.deepEqual(payload.to, ["account@example.test"]);
  assert.equal("html" in payload, false);
  assert.match(payload.text, /https:\/\/example.test\/account/);
  const requests: RequestInit[] = [];
  const mock: typeof fetch = async (_url, init) => {
    requests.push(init!);
    return Response.json({ id: "mock-receipt" });
  };
  assert.deepEqual(
    await sendResendEmail("fake-test-key", payload, "event-123", mock),
    { id: "mock-receipt" },
  );
  await sendResendEmail("fake-test-key", payload, "event-123", mock);
  assert.deepEqual(requests[0], requests[1]);
  assert.equal(
    (requests[0].headers as Record<string, string>)["Idempotency-Key"],
    "profile-status/event-123",
  );
  const limited: typeof fetch = async () => new Response("", { status: 429 });
  assert.match(
    (await sendResendEmail("fake-test-key", payload, "event-123", limited))
      .error!,
    /429/,
  );
  const offline: typeof fetch = async () => {
    throw new Error("Offline");
  };
  assert.match(
    (await sendResendEmail("fake-test-key", payload, "event-123", offline))
      .error!,
    /could not be confirmed/,
  );
});

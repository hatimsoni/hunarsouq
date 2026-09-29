import { test } from "node:test";
import assert from "node:assert/strict";
import {
  emptyProfile,
  profileSchema,
  draftProfileSchema,
  usernameSchema,
  resetSchema,
  safeNext,
} from "../../src/lib/validation";

const valid = {
  ...emptyProfile,
  full_name: "Amina Merchant",
  username: "amina_crafts",
  category_id: "11111111-1111-4111-8111-111111111111",
  bio: "I create carefully stitched everyday clothing for my local community.",
  city: "Pune",
};
test("profile validation enforces submission readiness and optional draft fields", () => {
  assert.equal(profileSchema.safeParse(valid).success, true);
  assert.equal(profileSchema.safeParse(emptyProfile).success, false);
  assert.equal(draftProfileSchema.safeParse(emptyProfile).success, true);
  assert.equal(
    profileSchema.safeParse({
      ...valid,
      portfolio_images: Array(7).fill("path"),
    }).success,
    false,
  );
});
test("contact choices cannot enable missing contact values", () => {
  assert.equal(
    profileSchema.safeParse({ ...valid, show_call: true }).success,
    false,
  );
  assert.equal(
    profileSchema.safeParse({ ...valid, show_email: true }).success,
    false,
  );
  assert.equal(
    profileSchema.safeParse({
      ...valid,
      phone: "+919876543210",
      show_call: true,
    }).success,
    true,
  );
  assert.equal(
    profileSchema.safeParse({ ...valid, phone: "9876543210" }).success,
    false,
  );
});
test("reserved names, malicious URLs, and external redirects are rejected", () => {
  for (const name of [
    "admin",
    "account",
    "login",
    "constructor",
    "UPPERCASE",
    "ab",
    "foo/bar",
  ])
    assert.equal(usernameSchema.safeParse(name).success, false, name);
  for (const url of [
    "not a url",
    "javascript:alert(1)",
    "http://example.com",
    "https://user:secret@example.com",
  ])
    assert.equal(
      profileSchema.safeParse({
        ...valid,
        links: { ...valid.links, website: url },
      }).success,
      false,
      url,
    );
  assert.equal(safeNext("//evil.example"), "/account");
  assert.equal(safeNext("/account/submit"), "/account/submit");
  assert.equal(safeNext("/account/../admin"), "/account");
});
test("password confirmation and server payload allowlists are enforced", () => {
  assert.equal(
    resetSchema.safeParse({
      password: "long-enough-password",
      confirm: "different",
    }).success,
    false,
  );
  const parsed = profileSchema.parse({
    ...valid,
    role: "admin",
    is_verified: true,
    status: "approved",
  });
  assert.equal("role" in parsed, false);
  assert.equal("is_verified" in parsed, false);
  assert.equal("status" in parsed, false);
});

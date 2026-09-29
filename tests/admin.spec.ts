import { test, expect } from "@playwright/test";
test("admin routes require authentication and never render private review controls anonymously", async ({
  page,
  context,
}) => {
  await context.addCookies([
    {
      name: "sb-fake-auth-token",
      value: "forged-admin-session",
      domain: "localhost",
      path: "/",
    },
  ]);
  for (const path of [
    "/admin",
    "/admin/reviews",
    "/admin/members",
    "/admin/categories",
    "/admin/notifications",
    "/admin/reviews/11111111-1111-4111-8111-111111111111",
  ]) {
    await page.goto(path);
    await expect(page).toHaveURL(/\/login\?next=%2Fadmin$/);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(
      "Welcome back.",
    );
    await expect(
      page.getByRole("button", { name: "Record decision" }),
    ).toHaveCount(0);
  }
});
test("worker and avatar endpoints fail closed when unconfigured", async ({
  request,
}) => {
  expect(
    (
      await request.post("/api/internal/status-emails", {
        headers: { Authorization: "Bearer forged-worker-secret" },
      })
    ).status(),
  ).toBe(503);
  expect((await request.get("/api/internal/status-emails")).status()).toBe(405);
  const avatar = await request.get(
    "/media/member-avatar/11111111-1111-4111-8111-111111111111",
  );
  expect(avatar.status()).toBe(404);
  expect(avatar.headers()["cache-control"]).toContain("no-store");
  expect((await request.get("/media/member-avatar/not-a-uuid")).status()).toBe(
    404,
  );
});
test("homepage does not present fabricated live counts when disconnected", async ({
  page,
}) => {
  await page.goto("/");
  await expect(
    page.getByText("A community taking shape", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText("Live member counts are not connected yet.", {
      exact: false,
    }),
  ).toBeVisible();
  await expect(
    page.getByText("0 verified members", { exact: true }),
  ).toHaveCount(0);
});

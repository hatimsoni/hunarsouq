import { test, expect } from "@playwright/test";
test("account routes require sign-in even with fabricated cookies", async ({
  page,
  context,
}) => {
  await context.addCookies([
    {
      name: "sb-fake-auth-token",
      value: "forged-session",
      domain: "localhost",
      path: "/",
    },
  ]);
  await page.goto("/account/submit");
  await expect(page).toHaveURL(/\/login\?next=%2Faccount%2Fsubmit/);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Welcome back.",
  );
  await expect(
    page.getByText("Account services are not connected yet.", { exact: false }),
  ).toBeVisible();
});
test("auth routes render mobile forms and expose no working fake sign-in", async ({
  page,
}) => {
  await page.setViewportSize({ width: 375, height: 812 });
  for (const route of [
    "/signup",
    "/login",
    "/forgot-password",
    "/reset-password",
  ]) {
    await page.goto(route);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeDisabled();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  }
});
test("invalid auth callbacks fail safely and cannot redirect off site", async ({
  page,
}) => {
  for (const route of [
    "/auth/callback?next=https://example.com",
    "/auth/confirm?type=admin&token_hash=bad",
  ]) {
    await page.goto(route);
    await expect(page).toHaveURL(/localhost:3100\/login\?notice=unavailable/);
  }
});

import { test, expect } from "@playwright/test";
test("directory filters survive navigation and clear on request", async ({
  page,
}) => {
  await page.goto("/hunar");
  await expect(
    page.getByRole("heading", { name: "Find your kind of talent." }),
  ).toBeVisible();
  await page.getByLabel("Search skills or people").fill("embroidery");
  await page.getByLabel("City", { exact: true }).fill("Pune");
  await page
    .getByLabel("Availability", { exact: true })
    .selectOption("available");
  await page.getByLabel("Verified only").check();
  await page.getByRole("button", { name: "Find talent" }).click();
  await expect(page).toHaveURL(/q=embroidery/);
  await expect(page.getByLabel("City", { exact: true })).toHaveValue("Pune");
  await expect(page.getByLabel("Verified only")).toBeChecked();
  await expect(page.getByRole("status")).toContainText(
    "directory is getting ready",
  );
  await page.getByRole("link", { name: "Clear filters" }).click();
  await expect(page.getByLabel("Search skills or people")).toHaveValue("");
});
test("public SEO routes and missing profiles fail safely", async ({
  request,
}) => {
  expect((await request.get("/unknown_member")).status()).toBe(404);
  expect(
    (
      await request.get(
        "/media/member-portfolio/11111111-1111-4111-8111-111111111111/0",
      )
    ).status(),
  ).toBe(404);
  const robots = await request.get("/robots.txt");
  expect(await robots.text()).toContain("Disallow: /admin");
  const sitemap = await request.get("/sitemap.xml");
  expect(await sitemap.text()).toContain("/hunar?skill=");
  expect(await sitemap.text()).not.toContain("/account");
  const og = await request.get("/og?skill=tailoring-stitching");
  expect(og.status()).toBe(200);
  expect(og.headers()["content-type"]).toContain("image/png");
  expect((await request.get("/og?username=unknown_member")).status()).toBe(404);
  const category = await request.get("/hunar?skill=tailoring-stitching");
  expect(await category.text()).toContain(
    "Tailoring &amp; Stitching community",
  );
});

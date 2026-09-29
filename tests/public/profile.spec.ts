import { test, expect } from "@playwright/test";
test("public profile keeps contacts private until tap, supports gallery and reporting", async ({
  page,
  request,
}) => {
  const response = await request.get("/amina_test");
  expect(response.status()).toBe(200);
  const html = await response.text();
  for (const secret of [
    "+919876543210",
    "+919876543211",
    "contact-fixture@example.test",
    "fixture-service-secret",
  ])
    expect(html).not.toContain(secret);
  expect(
    (await (await request.get("http://127.0.0.1:3301/__stats")).json())
      .contacts,
  ).toBe(0);
  await page.goto("/hunar");
  await page.getByRole("link", { name: /Amina Test Artisan/ }).click();
  await expect(
    page.getByRole("heading", { name: "Amina Test Artisan", exact: true }),
  ).toBeVisible();
  await expect(page.getByText("5 years of experience.")).toBeVisible();
  await expect(page.getByRole("link", { name: /Call/ })).toHaveCount(0);
  await page.getByRole("button", { name: "View portfolio image 1" }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.getByRole("button", { name: "Next image" }).click();
  await expect(page.getByRole("dialog")).toContainText("Image 2 of 2");
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page.getByRole("button", { name: "Contact Amina" }).click();
  await expect(
    page.getByRole("link", { name: "Call +919876543210" }),
  ).toHaveAttribute("href", "tel:+919876543210");
  await expect(
    page.getByRole("link", { name: "Message on WhatsApp" }),
  ).toHaveAttribute("href", "https://wa.me/919876543211");
  await expect(
    page.getByRole("link", { name: "Send an email" }),
  ).toHaveAttribute("href", "mailto:contact-fixture%40example.test");
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "Report this profile" }).click();
  await page
    .getByLabel("Details", { exact: true })
    .fill("The example biography needs a moderator to review it.");
  await page.getByRole("button", { name: "Submit report" }).click();
  await expect(page.getByRole("status")).toContainText(
    "review team will look into your report",
  );
  const stats = await (
    await request.get("http://127.0.0.1:3301/__stats")
  ).json();
  expect(stats.contacts).toBe(1);
  expect(stats.reports).toBe(1);
  await page.keyboard.press("Escape");
  await page.setViewportSize({ width: 375, height: 812 });
  await expect.poll(async () => page.locator('img').evaluateAll(images => images.every(image => (image as HTMLImageElement).complete && (image as HTMLImageElement).naturalWidth > 0))).toBe(true);
  await page.getByRole('heading', {name:'Amina Test Artisan',exact:true}).click();
  await page.evaluate(() => window.scrollTo({top:0,behavior:'instant'}));
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: "test-results/public-profile-mobile.png",
    fullPage: true,
  });
});

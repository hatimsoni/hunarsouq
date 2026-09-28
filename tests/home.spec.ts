import { test, expect } from "@playwright/test";

test("visitors can explore and search all launch categories", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toContainText(
    "Good people.",
  );
  await expect(page.locator('#skills a[href^="/hunar?skill="]')).toHaveCount(8);
  await page.getByRole("button", { name: "Explore all 17 categories" }).click();
  await expect(page.locator('#skills a[href^="/hunar?skill="]')).toHaveCount(
    17,
  );
  await page.getByRole("textbox", { name: "Search skills" }).fill("jewellery");
  await expect(page.locator('#skills a[href^="/hunar?skill="]')).toHaveCount(1);
  await page
    .getByRole("textbox", { name: "Search skills" })
    .fill("unknown skill");
  await expect(
    page.getByText("No skills found.", { exact: false }),
  ).toBeVisible();
});

test("FAQs reveal answers and placeholder pages are honest", async ({
  page,
}) => {
  await page.goto("/");
  const question = page.getByRole("button", {
    name: "How does verification work?",
  });
  await question.click();
  await expect(question).toHaveAttribute("aria-expanded", "true");
  await expect(
    page.getByText("A human reviewer will check", { exact: false }),
  ).toBeVisible();
  await page
    .getByRole("link", { name: "Join Hunar Souq", exact: true })
    .first()
    .click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Your hunar belongs here.",
  );
  await expect(
    page.getByText("Account services are not connected yet.", { exact: false }),
  ).toBeVisible();
});

test("mobile navigation works without horizontal overflow", async ({
  page,
}) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto("/");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page.getByRole("button", { name: "Open menu" }).click();
  const navigation = page.getByRole("navigation", {
    name: "Mobile navigation",
  });
  await expect(navigation).toBeVisible();
  await navigation.getByRole("link", { name: "Courses" }).click();
  await expect(page).toHaveURL(/\/courses$/);
  await expect(
    page.getByRole("navigation", { name: "Mobile navigation" }),
  ).toHaveCount(0);
});

test("all internal destinations respond and no public contact numbers are rendered", async ({
  page,
  request,
}) => {
  await page.goto("/");
  const links = await page
    .locator('a[href^="/"]')
    .evaluateAll((elements) => [
      ...new Set(elements.map((element) => element.getAttribute("href")!)),
    ]);
  for (const href of links)
    expect((await request.get(href)).status(), href).toBe(200);
  await expect(page.locator('a[href^="tel:"],a[href*="wa.me"]')).toHaveCount(0);
  expect((await request.get("/does-not-exist")).status()).toBe(404);
});

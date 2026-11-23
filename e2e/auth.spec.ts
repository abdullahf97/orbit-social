import { expect, test } from "@playwright/test";

// Auth flows need a signed-out browser, so ignore the shared demo session.
test.use({ storageState: { cookies: [], origins: [] } });

test.describe("authentication", () => {
  test("validates a field before any request is sent", async ({ page }) => {
    let requested = false;
    page.on("request", (request) => {
      if (request.url().includes("/api/auth/login")) requested = true;
    });

    await page.goto("/login");
    await page.getByLabel("Password", { exact: true }).click();
    await page.getByLabel("Password", { exact: true }).blur();

    await expect(page.getByText("Enter your password.")).toBeVisible();
    expect(requested).toBe(false);
  });

  test("rejects a wrong password without signing in", async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel("Username or email").fill("nova@orbit.app");
    await page.getByLabel("Password", { exact: true }).fill("wrong-password");
    await page.getByRole("button", { name: "Sign in" }).click();

    // Next.js injects its own route announcer with role="alert", so match the
    // visible form error rather than every alert on the page.
    await expect(
      page.getByRole("alert").filter({ hasText: "incorrect" }),
    ).toBeVisible();
    await expect(page).toHaveURL(/\/login/);
  });

  test("signs in with the demo account and lands on the feed", async ({
    page,
  }) => {
    await page.goto("/login");
    await page.getByRole("button", { name: "Explore the demo" }).click();

    await expect(page).toHaveURL(/\/feed$/);
    await expect(
      page.getByRole("heading", { name: "Your orbit" }),
    ).toBeVisible();
    await expect(page.locator("article").first()).toBeVisible();
  });

  test("warns when a username is already taken", async ({ page }) => {
    await page.goto("/signup");
    await page.getByLabel("Username").fill("nova");

    await expect(page.getByText("taken", { exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: /^@/ }).first()).toBeVisible();
  });

  test("accepts an available username", async ({ page }) => {
    const candidate = `test${Date.now().toString(36).slice(-6)}`;
    await page.goto("/signup");
    await page.getByLabel("Username").fill(candidate);

    await expect(page.getByText("available", { exact: true })).toBeVisible();
  });
});

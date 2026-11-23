import path from "node:path";
import { expect, test as setup } from "@playwright/test";
import { DEMO } from "./helpers";

/**
 * Signs in once and saves the httpOnly session cookie. Every spec reuses it,
 * which keeps the suite under the login rate limit (10 attempts / 10 minutes).
 */
const authFile = path.resolve("e2e/.auth/demo.json");

setup("authenticate as the demo user", async ({ page }) => {
  const response = await page.request.post("/api/auth/login", { data: DEMO });
  expect(response.ok(), await response.text()).toBeTruthy();
  await page.context().storageState({ path: authFile });
});

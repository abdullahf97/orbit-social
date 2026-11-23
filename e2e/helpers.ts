import { expect, type Page } from "@playwright/test";

export const DEMO = {
  identifier: "nova@orbit.app",
  password: "orbitdemo",
} as const;

/**
 * Signs in through the API and lets the browser context keep the session
 * cookie. Same-origin checks are skipped for requests without an Origin
 * header, which is how a server-to-server call looks.
 */
export async function loginAsDemo(page: Page) {
  const response = await page.request.post("/api/auth/login", { data: DEMO });
  expect(response.ok(), await response.text()).toBeTruthy();
}

/** Waits until the service worker controls the page (production only). */
export async function waitForServiceWorker(page: Page) {
  await page.waitForFunction(
    () => Boolean(navigator.serviceWorker?.controller),
    undefined,
    { timeout: 20_000 },
  );
}

export function firstPost(page: Page) {
  return page.locator("article").first();
}

export function likeButton(page: Page) {
  return firstPost(page).locator("button[aria-pressed]");
}

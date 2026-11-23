import { expect, test } from "@playwright/test";
import { likeButton, waitForServiceWorker } from "./helpers";

/**
 * These tests run against `next start` (see playwright.config.ts) because the
 * service worker is only registered in production builds. They rely on the
 * session saved by e2e/auth.setup.ts.
 */
test.describe("offline", () => {
  test("serves the cached feed after a cold reload with no connection", async ({
    page,
    context,
  }) => {
    await page.goto("/feed");

    const posts = page.locator("article");
    await expect(posts.first()).toBeVisible();
    await waitForServiceWorker(page);

    // The first navigation happened before the worker claimed the page, so it
    // was never cached. Reload once online to populate the page cache.
    await page.reload();
    await expect(posts.first()).toBeVisible();

    // Give the persister time to flush the query cache into IndexedDB.
    await page.waitForTimeout(2_000);

    await context.setOffline(true);
    await page.reload();

    await expect(page.getByRole("status")).toContainText(/offline/i);
    await expect(posts.first()).toBeVisible();

    await context.setOffline(false);
  });

  test("queues a like offline and replays it when the connection returns", async ({
    page,
    context,
  }) => {
    await page.goto("/feed");

    const like = likeButton(page);
    await expect(like).toBeVisible();

    const startedLiked = (await like.getAttribute("aria-pressed")) === "true";
    const queuedMethod = startedLiked ? "DELETE" : "POST";
    const restoreMethod = startedLiked ? "POST" : "DELETE";

    await context.setOffline(true);

    await like.click();
    await expect(like).toHaveAttribute("aria-pressed", String(!startedLiked));
    await expect(page.getByRole("status")).toContainText(/offline/i);

    const replay = page.waitForResponse(
      (response) =>
        response.url().includes("/like") &&
        response.request().method() === queuedMethod,
    );
    await context.setOffline(false);
    await replay;

    await expect(like).toHaveAttribute("aria-pressed", String(!startedLiked));

    // Restore the post to its original state.
    const restored = page.waitForResponse(
      (response) =>
        response.url().includes("/like") &&
        response.request().method() === restoreMethod,
    );
    await like.click();
    await restored;
    await expect(like).toHaveAttribute("aria-pressed", String(startedLiked));
  });
});

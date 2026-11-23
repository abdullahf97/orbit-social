import { expect, test } from "@playwright/test";
import { firstPost, likeButton } from "./helpers";

test.describe("feed", () => {
  test("loads more posts when the sentinel scrolls into view", async ({
    page,
  }) => {
    await page.goto("/explore");

    const posts = page.locator("a[href^='/p/']");
    await expect(posts.first()).toBeVisible();

    const initial = await posts.count();
    expect(initial).toBeGreaterThan(0);

    // Page size is 8 and the seed has 20 posts, so a second page must exist.
    for (let attempt = 0; attempt < 8; attempt += 1) {
      if ((await posts.count()) > initial) break;
      await posts.last().scrollIntoViewIfNeeded();
      await page.mouse.wheel(0, 2500);
      await page.waitForTimeout(400);
    }

    await expect
      .poll(() => posts.count(), { timeout: 15_000 })
      .toBeGreaterThan(initial);
  });

  test("likes optimistically, before the server answers", async ({ page }) => {
    let release!: () => void;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    let intercepted = 0;

    await page.route("**/api/posts/*/like", async (route) => {
      intercepted += 1;
      await gate;
      await route.continue();
    });

    await page.goto("/feed");
    const like = likeButton(page);
    await expect(like).toBeVisible();

    const startedLiked = (await like.getAttribute("aria-pressed")) === "true";
    await like.click();

    // The UI flips immediately; the request is still parked behind the gate.
    await expect(like).toHaveAttribute("aria-pressed", String(!startedLiked));
    expect(intercepted).toBe(1);

    release();
    await expect(like).toHaveAttribute("aria-pressed", String(!startedLiked));

    // Put the post back the way we found it. Filter on the opposite HTTP verb
    // so we wait for this click's response, not the one released above.
    const restoreMethod = startedLiked ? "POST" : "DELETE";
    const settled = page.waitForResponse(
      (response) =>
        response.url().includes("/like") &&
        response.request().method() === restoreMethod,
    );
    await like.click();
    await settled;
    await expect(like).toHaveAttribute("aria-pressed", String(startedLiked));
  });

  test("adds a comment optimistically and deletes it", async ({ page }) => {
    await page.goto("/feed");
    await firstPost(page).getByRole("button", { name: "Open comments" }).click();

    const dialog = page.getByRole("dialog", { name: "Comments" });
    const body = `e2e comment ${Date.now().toString(36)}`;

    await dialog.getByLabel("Add a comment").fill(body);
    await dialog.getByRole("button", { name: "Post comment" }).click();

    const row = dialog.locator("li").filter({ hasText: body });
    await expect(row).toBeVisible();

    await row.getByRole("button", { name: "Delete comment" }).click();
    await expect(row).toHaveCount(0);
  });

  test("opens a post detail page from the post menu", async ({ page }) => {
    await page.goto("/feed");
    const post = firstPost(page);
    await expect(post).toBeVisible();

    await post.getByRole("button", { name: "Post options" }).click();
    await page.getByRole("link", { name: "Open post" }).click();

    await expect(page).toHaveURL(/\/p\/.+/);
    await expect(
      page.getByRole("heading", { name: "Comments" }),
    ).toBeVisible();
  });
});

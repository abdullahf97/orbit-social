import { expect, test } from "@playwright/test";
import { DEMO, loginAsDemo } from "./helpers";

test.describe("following", () => {
  test("follows and unfollows from a profile, and the state survives a reload", async ({
    page,
  }) => {
    await page.goto("/u/milo");

    // The right rail also has a "Follow milo" suggestion button, so scope to
    // the profile content.
    const main = page.getByRole("main");
    const follow = main.getByRole("button", { name: "Follow milo" });
    const unfollow = main.getByRole("button", { name: "Unfollow milo" });

    // Normalise to "not following" so the test is repeatable.
    await expect(follow.or(unfollow)).toBeVisible();
    if (await unfollow.isVisible()) {
      await unfollow.click();
      await expect(follow).toBeVisible();
    }

    await follow.click();
    await expect(unfollow).toBeVisible();

    await page.reload();
    await expect(unfollow).toBeVisible();

    await unfollow.click();
    await expect(follow).toBeVisible();
  });

  test("shows an unread badge and clears it with mark all read", async ({
    page,
  }) => {
    // Create a fresh FOLLOW notification for nova: kai unfollows, then follows.
    const kaiLogin = await page.request.post("/api/auth/login", {
      data: { identifier: "kai@orbit.app", password: DEMO.password },
    });
    expect(kaiLogin.ok()).toBeTruthy();
    expect((await page.request.delete("/api/users/nova/follow")).ok()).toBeTruthy();
    expect((await page.request.post("/api/users/nova/follow")).ok()).toBeTruthy();

    await loginAsDemo(page);
    await page.goto("/feed");

    const nav = page.getByRole("navigation", { name: "Main navigation" });
    const badgeLink = nav.getByRole("link", { name: /Notifications \d+/ });
    await expect(badgeLink).toBeVisible();

    await page.goto("/notifications");
    const markAll = page.getByRole("button", { name: "Mark all read" });
    await expect(markAll).toBeEnabled();
    await markAll.click();

    await expect(markAll).toBeDisabled();
    await expect(
      nav.getByRole("link", { name: "Notifications", exact: true }),
    ).toBeVisible();
  });
});

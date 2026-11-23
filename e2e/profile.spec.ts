import { expect, test } from "@playwright/test";

const ONE_PIXEL_PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=",
  "base64",
);

test.describe("profile and posts", () => {
  test("refuses to save an empty display name", async ({ page }) => {
    await page.goto("/settings");

    const name = page.getByLabel("Name");
    await expect(name).toHaveValue(/\S+/);
    await name.fill("");
    await page.getByRole("button", { name: "Save changes" }).click();

    await expect(page.getByText("Your name can't be empty.")).toBeVisible();
  });

  test("previews a selected image locally before uploading", async ({ page }) => {
    await page.goto("/feed");
    await page.getByRole("button", { name: "New post" }).click();

    const dialog = page.getByRole("dialog", { name: "New post" });
    await expect(dialog).toBeVisible();

    await dialog.locator('input[type="file"]').setInputFiles({
      name: "preview.png",
      mimeType: "image/png",
      buffer: ONE_PIXEL_PNG,
    });

    await expect(dialog.getByAltText("Selected preview")).toBeVisible();

    // Nothing was uploaded: removing the preview is a pure client operation.
    await dialog.getByRole("button", { name: "Remove image" }).click();
    await expect(dialog.getByAltText("Selected preview")).toHaveCount(0);

    await dialog.getByRole("button", { name: "Close", exact: true }).click();
    await expect(dialog).toBeHidden();
  });

  test("creates a post and deletes it again", async ({ page }) => {
    const caption = `e2e post ${Date.now().toString(36)}`;

    await page.goto("/feed");
    await page.getByRole("button", { name: "New post" }).click();

    const composer = page.getByRole("dialog", { name: "New post" });
    await composer.getByLabel("Post caption").fill(caption);
    await composer.getByRole("button", { name: "Share" }).click();

    await expect(composer).toBeHidden();

    const article = page.locator("article").filter({ hasText: caption }).first();
    await expect(article).toBeVisible();

    await article.getByRole("button", { name: "Post options" }).click();
    await page.getByRole("button", { name: "Delete post" }).click();

    const confirm = page.getByRole("dialog", { name: "Delete this post?" });
    await confirm.getByRole("button", { name: "Delete post" }).click();

    await expect(article).toHaveCount(0);
  });
});

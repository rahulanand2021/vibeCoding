import { test, expect } from "@playwright/test";

test.describe("Kanban board", () => {
  test("board loads seeded data", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByText("Backlog")).toBeVisible();
    await expect(page.getByText("To Do")).toBeVisible();
    await expect(page.getByText("In Progress")).toBeVisible();
    await expect(page.getByText("Review")).toBeVisible();
    await expect(page.getByText("Done")).toBeVisible();
  });

  test("column rename flow", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "Backlog" }).click();
    const input = page.getByLabel("Column title");
    await input.fill("Ideas");
    await input.press("Enter");
    await expect(page.getByText("Ideas")).toBeVisible();
  });

  test("add and delete flow with confirmation overlay", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "Add card" }).first().click();

    await page.getByLabel("Card title").fill("QA prep");
    await page.getByLabel("Card details").fill("Build a quick regression checklist.");
    await page.getByRole("button", { name: "Add card" }).click();

    const card = page.locator("[data-card-title='QA prep']");
    await expect(card).toBeVisible();

    await card.getByRole("button", { name: "Delete card" }).click();
    await page.getByRole("button", { name: "Delete" }).click();

    await expect(page.locator("[data-card-title='QA prep']")).toHaveCount(0);
  });

  test("edit card flow", async ({ page }) => {
    await page.goto("/");
    const card = page.locator("[data-card-title='Design review']");
    await card.getByRole("button", { name: "Edit card" }).click();

    const titleInput = page.getByLabel("Card title");
    await titleInput.fill("Design critique");
    await page.getByRole("button", { name: "Save changes" }).click();

    await expect(page.getByText("Design critique")).toBeVisible();
  });

  test("drag-and-drop move across columns", async ({ page }) => {
    await page.goto("/");

    const source = page.locator("[data-card-title='Draft onboarding flow']");
    const target = page.locator("[data-testid='column-drop-in-progress']");

    await source.dragTo(target);

    await expect(
      page.locator(
        "[data-testid='column-in-progress'] [data-card-title='Draft onboarding flow']"
      )
    ).toBeVisible();
  });
});

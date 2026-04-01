import { expect, test } from "@playwright/test";

test("loads dummy board data", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Product Launch Board" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Backlog" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Done" })).toBeVisible();
});

test("renames a column", async ({ page }) => {
  await page.goto("/");
  await page.getByTestId("column-column-backlog").locator(".column-header").hover();
  const backlogInput = page.getByTestId("column-column-backlog").locator("input").first();
  await backlogInput.fill("Ideas");
  await page.getByRole("button", { name: "Rename" }).first().click();
  await expect(page.getByRole("heading", { name: "Ideas" })).toBeVisible();
});

test("adds and deletes a card", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Add" }).first().click();
  await page.getByLabel("Card title").first().fill("Playwright task");
  await page.getByLabel("Card details").first().fill("Validate card creation and deletion.");
  await page.getByRole("button", { name: "Add card" }).first().click();
  await expect(page.getByRole("heading", { name: "Playwright task" })).toBeVisible();
  await page.getByLabel("Delete Playwright task").click();
  await page.getByRole("button", { name: "Delete" }).click();
  await expect(page.getByRole("heading", { name: "Playwright task" })).toHaveCount(0);
});

test("edits a card", async ({ page }) => {
  await page.goto("/");
  await page.getByLabel("Edit Draft launch narrative").click();
  await page.getByLabel("Edit card title").fill("Refined launch narrative");
  await page.getByLabel("Edit card details").fill("Sync with design and product marketing.");
  await page.getByRole("button", { name: "Save" }).click();
  await expect(page.getByRole("heading", { name: "Refined launch narrative" })).toBeVisible();
  await expect(page.getByText("Sync with design and product marketing.")).toBeVisible();
});

test("moves a card between columns", async ({ page }) => {
  await page.goto("/");

  const card = page.getByTestId("card-card-1");
  const targetDropArea = page.getByTestId("column-column-todo").locator(".column-cards");
  const sourceBox = await card.boundingBox();
  const targetBox = await targetDropArea.boundingBox();

  if (!sourceBox || !targetBox) {
    throw new Error("Could not resolve drag/drop bounding boxes");
  }

  await page.mouse.move(sourceBox.x + sourceBox.width / 2, sourceBox.y + sourceBox.height / 2);
  await page.mouse.down();
  await page.mouse.move(targetBox.x + 30, targetBox.y + 30, { steps: 12 });
  await page.mouse.up();

  const targetColumn = page.getByTestId("column-column-todo");
  await expect(targetColumn.getByRole("heading", { name: "Draft launch narrative" })).toBeVisible();
});

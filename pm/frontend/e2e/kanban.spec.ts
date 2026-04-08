import { test, expect } from "@playwright/test";

async function loginAsDefaultUser(page: Parameters<typeof test>[1]) {
  await page.goto("/");
  await page.getByLabel("Username").fill("user");
  await page.getByLabel("Password").fill("password");
  await page.getByRole("button", { name: /sign in/i }).click();
  await expect(page.getByText("Kanban Flow")).toBeVisible();
}

test.describe("Kanban board", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsDefaultUser(page);
  });

  test("login and logout flow", async ({ page }) => {
    await page.goto("/");
    // Should see login heading
    await expect(page.getByRole("heading", { name: "Kanban Flow" })).toBeVisible();

    await page.getByLabel("Username").fill("user");
    await page.getByLabel("Password").fill("password");
    await page.getByRole("button", { name: /sign in/i }).click();

    await expect(page.getByText("Kanban Flow")).toBeVisible();

    await page.getByRole("button", { name: /logout/i }).click();
    // After logout, login form reappears
    await expect(page.getByLabelText("Username")).toBeVisible();
  });

  test("invalid login shows error", async ({ page }) => {
    await page.goto("/");
    await page.getByLabel("Username").fill("wrong");
    await page.getByLabel("Password").fill("wrong");
    await page.getByRole("button", { name: /sign in/i }).click();
    await expect(page.getByText(/invalid username or password/i)).toBeVisible();
  });

  test("board loads seeded data", async ({ page }) => {
    await expect(page.getByText("Backlog")).toBeVisible();
    await expect(page.getByText("To Do")).toBeVisible();
    await expect(page.getByText("In Progress")).toBeVisible();
    await expect(page.getByText("Review")).toBeVisible();
    await expect(page.getByText("Done")).toBeVisible();
  });

  test("column rename flow", async ({ page }) => {
    await page.getByRole("button", { name: "Backlog" }).click();
    const input = page.getByLabel("Column title");
    await input.fill("Ideas");
    await input.press("Enter");
    await expect(page.getByText("Ideas")).toBeVisible();
  });

  test("add card with priority", async ({ page }) => {
    await page.getByRole("button", { name: /add card to backlog/i }).click();

    await page.getByLabel("Card title").fill("QA prep");
    await page.getByLabel("Card details").fill("Build a quick regression checklist.");
    await page.getByLabel("Card priority").selectOption("high");
    await page.getByRole("button", { name: "Add card" }).click();

    await expect(page.locator("[data-card-title='QA prep']")).toBeVisible();
    await expect(page.locator("[data-card-title='QA prep']").getByText("high")).toBeVisible();
  });

  test("delete card flow", async ({ page }) => {
    await page.getByRole("button", { name: /add card to backlog/i }).click();

    await page.getByLabel("Card title").fill("Delete me");
    await page.getByLabel("Card details").fill("Temporary card.");
    await page.getByRole("button", { name: "Add card" }).click();

    const card = page.locator("[data-card-title='Delete me']");
    await expect(card).toBeVisible();

    await card.getByRole("button", { name: "Delete card" }).click();
    await page.getByRole("button", { name: "Delete" }).click();

    await expect(page.locator("[data-card-title='Delete me']")).toHaveCount(0);
  });

  test("edit card flow", async ({ page }) => {
    const card = page.locator("[data-card-title='Design review']");
    await card.getByRole("button", { name: "Edit card" }).click();

    const titleInput = page.getByLabel("Card title");
    await titleInput.fill("Design critique");
    await page.getByRole("button", { name: "Save changes" }).click();

    await expect(page.getByText("Design critique")).toBeVisible();
  });

  test("add and delete a column", async ({ page }) => {
    await page.getByRole("button", { name: /add column/i }).click();
    await page.getByLabel("New column name").fill("Design");
    await page.getByRole("button", { name: /^add$/i }).click();
    await expect(page.getByText("Design")).toBeVisible();
  });

  test("card search filters cards", async ({ page }) => {
    await page.getByLabel("Search cards").fill("kickoff");
    // Kickoff meeting card is in Done column
    await expect(page.locator("[data-card-title='Kickoff meeting']")).toBeVisible();
    // Other cards should not be shown
    await expect(page.locator("[data-card-title='Design review']")).toHaveCount(0);
  });

  test("drag-and-drop move across columns", async ({ page }) => {
    await page.goto("/");
    await loginAsDefaultUser(page);

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

import { test, expect } from '@playwright/test';

test('board loads seeded data', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByText('Backlog')).toBeVisible();
  await expect(page.getByText('To Do')).toBeVisible();
  await expect(page.getByText('In Progress')).toBeVisible();
  await expect(page.getByText('Review')).toBeVisible();
  await expect(page.getByText('Done')).toBeVisible();
  await expect(page.getByText('Define project scope')).toBeVisible();
});

test('column rename flow', async ({ page }) => {
  await page.goto('/');
  await page.getByText('Backlog').click();
  await page.getByDisplayValue('Backlog').fill('New Backlog');
  await page.keyboard.press('Enter');
  await expect(page.getByText('New Backlog')).toBeVisible();
});

test('add and delete flow with custom confirmation overlay', async ({ page }) => {
  await page.goto('/');
  // Add card
  await page.getByText('+ Add Card').first().click();
  await page.getByLabel('Title').fill('Test Card');
  await page.getByLabel('Details').fill('Test Details');
  await page.getByText('Add Card').click();
  await expect(page.getByText('Test Card')).toBeVisible();

  // Delete card
  await page.locator('text=🗑️').first().click();
  await page.getByText('Delete').click();
  await expect(page.getByText('Test Card')).not.toBeVisible();
});

test('edit card flow', async ({ page }) => {
  await page.goto('/');
  await page.locator('text=✏️').first().click();
  await page.getByDisplayValue('Define project scope').fill('Updated Title');
  await page.getByText('Save').click();
  await expect(page.getByText('Updated Title')).toBeVisible();
});

test('drag-and-drop move across columns', async ({ page }) => {
  await page.goto('/');
  const card = page.getByText('Define project scope');
  const toDoColumn = page.getByText('To Do');
  await card.dragTo(toDoColumn);
  await expect(page.locator('[data-column="to-do"]').getByText('Define project scope')).toBeVisible();
});
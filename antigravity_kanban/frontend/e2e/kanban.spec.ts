import { test, expect } from '@playwright/test';

test.describe('Kanban MVP Board', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/');
    });

    test('should load the seeded board with 5 columns', async ({ page }) => {
        await expect(page.locator('h1')).toHaveText('MVP Board');
        const cols = page.locator('h2');
        await expect(cols).toHaveCount(5);
        await expect(cols.nth(0)).toHaveText('Backlog');
        await expect(cols.nth(1)).toHaveText('To Do');
        await expect(cols.nth(2)).toHaveText('In Progress');
        await expect(cols.nth(3)).toHaveText('Review');
        await expect(cols.nth(4)).toHaveText('Done');

        await expect(page.getByText('Research Features')).toBeVisible();
        await expect(page.getByText('Implement Drag and Drop')).toBeVisible();
    });

    test('should allow renaming a column', async ({ page }) => {
        const backlogCol = page.locator('h2').filter({ hasText: 'Backlog' });
        await backlogCol.click({ force: true });

        const input = page.locator('input[value="Backlog"]');
        await expect(input).toBeVisible();

        await input.fill('New Backlog');
        await input.press('Enter');

        await expect(page.locator('h2').filter({ hasText: 'New Backlog' })).toBeVisible();
    });

    test('should allow adding a card and then deleting it with custom overlay', async ({ page }) => {
        const addCardBtns = page.getByRole('button', { name: 'Add card' });
        await addCardBtns.nth(4).click({ force: true });

        await expect(page.getByText('Add New Card')).toBeVisible();

        await page.getByPlaceholder('Enter card title...').fill('Playwright Test Card');
        await page.getByPlaceholder('Enter card details...').fill('Test details content');

        await page.getByRole('button', { name: 'Create', exact: true }).click({ force: true });

        await expect(page.getByText('Playwright Test Card')).toBeVisible();
        await expect(page.getByText('Test details content')).toBeVisible();

        const card = page.locator('div', { hasText: 'Playwright Test Card' }).first();
        await card.getByRole('button', { name: 'Delete Card' }).first().click({ force: true });

        await expect(page.getByText('Are you sure you want to delete this card?')).toBeVisible();

        await page.getByRole('button', { name: 'Keep' }).click({ force: true });
        await expect(page.getByText('Playwright Test Card')).toBeVisible();

        await card.getByRole('button', { name: 'Delete Card' }).first().click({ force: true });
        await page.getByRole('button', { name: 'Delete' }).click({ force: true });

        await expect(page.getByText('Playwright Test Card')).toBeHidden();
    });

    test('should allow editing a card', async ({ page }) => {
        const card = page.locator('div', { hasText: 'Research Features' }).first();
        await card.getByRole('button', { name: 'Edit Card' }).first().click({ force: true });

        await expect(page.getByText('Edit Card', { exact: true })).toBeVisible();
        await page.getByPlaceholder('Enter card title...').fill('Research Epic');
        await page.getByRole('button', { name: 'Save changes' }).click({ force: true });

        await expect(page.getByText('Research Epic')).toBeVisible();
        await expect(page.getByText('Research Features')).toBeHidden();
    });
});

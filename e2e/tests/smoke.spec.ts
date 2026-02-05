import { test, expect } from '@playwright/test';

test.describe('Smoke Tests', () => {
  test('app loads and redirects unauthenticated users to login', async ({ page }) => {
    await page.goto('/');

    // Should redirect to login page
    await expect(page).toHaveURL(/\/login/);
  });

  test('login page has required elements', async ({ page }) => {
    await page.goto('/login');

    // Check for email input
    await expect(page.getByLabel(/email/i)).toBeVisible();

    // Check for password input
    await expect(page.getByLabel(/password/i)).toBeVisible();

    // Check for submit button
    await expect(page.getByRole('button', { name: /sign in|log in/i })).toBeVisible();
  });
});

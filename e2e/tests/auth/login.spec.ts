import { test, expect } from '@playwright/test';
import { TEST_USER } from '../../utils/test-user.js';

test.describe('Authentication', () => {
  test('successful login redirects to home', async ({ page }) => {
    await page.goto('/login');

    await page.getByLabel(/email/i).fill(TEST_USER.email);
    await page.getByLabel(/password/i).fill(TEST_USER.password);
    await page.getByRole('button', { name: /sign in|log in/i }).click();

    // Should redirect away from login page
    await expect(page).not.toHaveURL(/\/login/);
  });

  test('failed login shows error message', async ({ page }) => {
    await page.goto('/login');

    await page.getByLabel(/email/i).fill(TEST_USER.email);
    await page.getByLabel(/password/i).fill('wrongpassword');
    await page.getByRole('button', { name: /sign in|log in/i }).click();

    // Should stay on login page and show error
    await expect(page).toHaveURL(/\/login/);
    await expect(page.getByText(/invalid|incorrect|failed|error/i)).toBeVisible();
  });

  test('logout redirects to login page', async ({ page }) => {
    // First login
    await page.goto('/login');
    await page.getByLabel(/email/i).fill(TEST_USER.email);
    await page.getByLabel(/password/i).fill(TEST_USER.password);
    await page.getByRole('button', { name: /sign in|log in/i }).click();

    // Wait for redirect away from login
    await expect(page).not.toHaveURL(/\/login/);

    // Click logout button
    await page.getByRole('button', { name: /log ?out|sign ?out/i }).click();

    // Should redirect to login
    await expect(page).toHaveURL(/\/login/);
  });
});

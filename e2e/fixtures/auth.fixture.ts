import { test as base, type Page } from '@playwright/test';
import { TEST_USER } from '../utils/test-user.js';

type AuthFixtures = {
  authenticatedPage: Page;
};

export const test = base.extend<AuthFixtures>({
  authenticatedPage: async ({ page }, use) => {
    // Navigate to login page
    await page.goto('/login');

    // Fill in credentials
    await page.getByLabel(/email/i).fill(TEST_USER.email);
    await page.getByLabel(/password/i).fill(TEST_USER.password);

    // Submit login form
    await page.getByRole('button', { name: /sign in|log in/i }).click();

    // Wait for redirect away from login
    await page.waitForURL((url) => !url.pathname.includes('/login'));

    await use(page);
  },
});

export { expect } from '@playwright/test';

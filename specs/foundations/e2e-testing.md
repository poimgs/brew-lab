# E2E Testing

End-to-end tests verify complete user flows through the application using Playwright.

## Environments

E2E tests run against a separate test environment to avoid conflicts with development:

| Component | Development | E2E Tests |
|-----------|-------------|-----------|
| Database | `coffee_tracker` | `coffee_tracker_test` |
| Backend port | 8080 | 8081 |
| Frontend port | 5173 | 5174 |

## Running Tests

Ensure database is running:

```bash
docker compose up -d
```

From `e2e/` directory:

```bash
make install     # Install dependencies (first time)
make test        # Run all tests
make test-ui     # Interactive UI mode
make test-headed # Run with visible browser
```

## Test User

A seeded user is available for authenticated tests:

```typescript
const TEST_USER = {
  email: 'test@example.com',
  password: 'testpassword123',
};
```

Import from `utils/test-user.ts` when needed.

## Fixtures

### `authenticatedPage`

Provides a pre-authenticated page for tests requiring login:

```typescript
import { test, expect } from '../fixtures/auth.fixture';

test('feature test', async ({ authenticatedPage }) => {
  await authenticatedPage.goto('/some-page');
  // Page is already logged in
});
```

Use raw `page` from `@playwright/test` for unauthenticated flows (login page, public routes).

## Writing Tests

### Element Selection

Prefer accessible selectors:

```typescript
// Good - accessible and stable
page.getByRole('button', { name: /submit/i })
page.getByLabel(/email/i)
page.getByText(/success/i)

// Avoid - brittle
page.locator('.submit-btn')
page.locator('#email-input')
```

### Navigation and Waiting

Use auto-waiting assertions after actions:

```typescript
await page.getByRole('button', { name: /save/i }).click();
await expect(page).toHaveURL('/dashboard');
await expect(page.getByText(/saved/i)).toBeVisible();
```

### Example Test

```typescript
import { test, expect } from '../fixtures/auth.fixture';

test('can complete a user flow', async ({ authenticatedPage }) => {
  // Navigate
  await authenticatedPage.goto('/items');

  // Interact
  await authenticatedPage.getByRole('button', { name: /new/i }).click();
  await authenticatedPage.getByLabel(/name/i).fill('Test Item');
  await authenticatedPage.getByRole('button', { name: /save/i }).click();

  // Assert
  await expect(authenticatedPage).toHaveURL(/\/items\/\d+/);
  await expect(authenticatedPage.getByText('Test Item')).toBeVisible();
});
```

## Directory Conventions

```
e2e/
├── fixtures/           # Reusable test fixtures
├── utils/              # Helpers and constants
└── tests/
    ├── smoke.spec.ts   # Basic app health checks
    └── feature-name/   # Group by feature
        └── flow.spec.ts
```

Name test files `*.spec.ts`. Group related tests in feature directories.

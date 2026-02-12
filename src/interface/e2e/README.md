# E2E Tests (Playwright)

## Test lifecycle

```
globalSetup    →  Register test user via API
auth-setup     →  Login via API, save cookies to e2e/.auth/user.json
authenticated  →  Run specs with saved cookies
public         →  Run specs without auth
globalTeardown →  Login + delete test user via API
```

The test user (`e2e-test@planscape.local`) is created before all tests and destroyed after all tests. This requires `ALLOW_DELETE_USERS=True` in the backend environment.

## Directory structure

```
e2e/
├── global.setup.ts          # Creates the test user
├── global.teardown.ts       # Destroys the test user
├── auth.setup.ts            # Logs in and saves cookies
├── fixtures/
│   └── test-users.ts        # Test user credentials
├── helpers/
│   └── api-client.ts        # API helpers (register, login, destroy)
├── pages/                   # Page objects
│   ├── login.page.ts
│   ├── navigation.page.ts
│   └── signup.page.ts
└── specs/
    ├── auth/                # Authenticated tests (need login)
    │   └── logout.spec.ts
    └── public/              # Public tests (no auth needed)
        ├── auth/
        │   ├── create-account.spec.ts
        │   └── login.spec.ts
        └── explore/
            └── explore.spec.ts
```

## Where to put new tests

- **Needs a logged-in user?** Put it under `e2e/specs/` (any folder except `public/`).
  It will run with saved auth cookies automatically.
- **No auth needed?** Put it under `e2e/specs/public/`.

## Running locally

```bash
# Run all e2e tests (starts dev server automatically)
npx playwright test

# Run only authenticated tests
npx playwright test --project=authenticated

# Run only public tests
npx playwright test --project=public

# Run with UI mode
npx playwright test --ui
```

Set `E2E_BASE_URL` to skip the automatic dev server and test against a running instance:

```bash
E2E_BASE_URL=http://localhost:4200 npx playwright test
```

## Coverage

All tests from the previous Cypress suite have been migrated to Playwright.

## Backend requirements

The backend needs these env vars for e2e support:

- `ALLOW_DELETE_USERS=True` — enables the `/users/e2e/destroy/` endpoint
- `ACCOUNT_EMAIL_VERIFICATION=none` — allows test user registration without email verification

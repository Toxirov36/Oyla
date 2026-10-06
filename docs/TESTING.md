# Automated verification and CI

## Local checks

Install with `npm ci`, configure development PostgreSQL/Redis, then run migrations and `npm run db:seed`. New or updated API code must be built before browser tests.

```powershell
npm run lint
npm run typecheck
npm test
npm run build
npx playwright install chromium
npm run test:browser
```

`npm test` runs the backend Node test suite and the frontend Vitest/Testing Library suite. `npm run test:web` runs only frontend component/API-client tests. `npm run test:coverage -w @oyla/web` generates a local coverage report. `npm run test:browser:report` opens the Playwright HTML report.

Browser tests exercise real HTTP requests, the NestJS guards/DTOs, PostgreSQL, and the question/reward engine. The suite includes registration validation, login, profile save/reload/logout, mobile layout, teacher/admin profiles, grade-specific content access, correct answers, educational retries, result calculation, and profile XP.

## Isolation

Playwright starts its own API on port **3101** and frontend on **5180**, leaving the normal app's ports 3001/5173 in place. `scripts/browser-environment.ts` creates an ignored `.local/browser-api.env` with a separate JWT secret and test-only rate limits. Redis counters use database 1, while the normal development app uses database 0. The API supports `OYLA_ENV_FILE` for this explicit test configuration; defaults are unchanged.

The test database must be local and non-production. By default the suite reads the existing development database configuration. `BROWSER_DATABASE_URL` and `BROWSER_REDIS_URL` can select a dedicated local test environment. Seed the selected database first. Every student test creates a UUID-named fixture and deletes only its own fixture afterward. Teacher/admin tests read demo accounts and revoke their test sessions. Existing users, progress, XP, assignments, and catalog rows are preserved. No production endpoint or paid service is used.

Failures save screenshots and traces in ignored `test-results/` and a report in `playwright-report/`. The standard API integration suite is still available as `npm run test:e2e` with a running API on port 3001.

## GitHub Actions

`.github/workflows/ci.yml` runs on push and pull request. It provisions PostgreSQL 18 and Redis 7, installs Node 24 and dependencies, generates Prisma, applies migrations, seeds the grade-specific catalog, and runs lint, strict type checks (including test/tooling TypeScript), backend/frontend unit tests, production builds, Chromium browser tests, API integration tests, and a dependency audit. Failure diagnostics are retained for seven days.

Action revisions are pinned to verified commit SHAs. The workflow has read-only repository permissions and cancels superseded runs. Database/JWT/demo credentials in this workflow are disposable CI fixtures. With no configured Git remote, the workflow cannot be dispatched here; all corresponding project checks can run locally before a push.

References: [Playwright web servers](https://playwright.dev/docs/test-webserver), [Playwright CI](https://playwright.dev/docs/ci-intro), [Vitest](https://vitest.dev/guide/), [React Testing Library](https://testing-library.com/docs/react-testing-library/intro/).

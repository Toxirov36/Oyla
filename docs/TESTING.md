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

Browser tests exercise real HTTP requests, the NestJS guards/DTOs, PostgreSQL, and the question/reward engine. The 25-test suite includes registration validation, login, profile save/reload/logout, mobile layout, teacher/admin profiles, grade-specific content access, correct answers, educational retries, result calculation, profile XP, password changes, existing-role editing, combined admin/teacher access, reset-link issuance/redemption/replay, recovery requests, notification pagination/read state, desktop popover/mobile sheet sizing, ESC/focus restoration, read/unread actions, deletion, navigation, type/search filters, dark theme, loading/retry, and optimistic rollback. The notification tests save desktop, mobile, and dark screenshots under their `test-results/` directories. Modal combobox checks cover search/empty results, keyboard selection, nested ESC behavior, alternate teacher UUID submission, and class-dependent lesson reset with real persistence.

## Isolation

Playwright starts its own API on port **3101** and frontend on **5180**, leaving the normal app's ports 3001/5173 in place. `scripts/browser-environment.ts` creates an ignored `.local/browser-api.env` with a separate JWT secret and test-only rate limits. Redis counters use database 1, while the normal development app uses database 0. The API supports `OYLA_ENV_FILE` for this explicit test configuration; defaults are unchanged.

The test database must be local and non-production. By default the suite reads the existing development database configuration. `BROWSER_DATABASE_URL` and `BROWSER_REDIS_URL` can select a dedicated local test environment. Seed the selected database first. Every student test creates a UUID-named fixture and deletes only its own fixture afterward. Teacher/admin tests read demo accounts and revoke their test sessions. Existing users, progress, XP, assignments, and catalog rows are preserved. No production endpoint or paid service is used.

Failures save screenshots and traces in ignored `test-results/` and a report in `playwright-report/`. The API integration suite is available as `npm run test:e2e` with a running API on port 3001, or an explicit local `E2E_API` base URL. Its 16 groups include role/history preservation, session invalidation, teacher/class safeguards, required current passwords, expired/replaced/parallel reset tokens, recovery-response privacy, and notification ownership/idempotency. Use a separate local test API with higher test-only `AUTH_RATE_LIMIT`/`API_RATE_LIMIT`; the security suite intentionally performs more authentication operations than the production limit allows within one minute. CI supplies those test limits. Recovery fixtures also remove only their own notifications sent to administrators.

## GitHub Actions

The student-class tests cover sidebar and profile navigation, empty/unassigned and anonymous states, multiple-class selection, private classmates, outgoing/incoming/accepted friend states, completed/pending/overdue assignments, own-score isolation, exact class ranking links and mobile overflow. Live API checks additionally reject foreign/mismatched classes and classmate requests, exclude inactive/staff members and hidden/old-grade assignments, preserve own-only submissions and deduplicate a classmate request shared across two classes.

`.github/workflows/ci.yml` runs on push and pull request. It provisions PostgreSQL 18 and Redis 7, installs Node 24 and dependencies, generates Prisma, applies migrations, seeds the grade-specific catalog, and runs lint, strict type checks (including test/tooling TypeScript), backend/frontend unit tests, production builds, Chromium browser tests, API integration tests, and a dependency audit. Failure diagnostics are retained for seven days.

Prisma ORM 7.10 uses the root `prisma.config.ts`, a generated client under `apps/api/generated/`, and the PostgreSQL driver adapter. CI runs `npm run db:generate` before type checking and building. The current Prisma CLI dependency tree reports four upstream high-severity advisories; `scripts/audit.mjs` allowlists only those exact Prisma advisory IDs and fails for any other or newly introduced vulnerability.

Action revisions are pinned to verified commit SHAs. The workflow has read-only repository permissions and cancels superseded runs. Database/JWT/demo credentials in this workflow are disposable CI fixtures. Pushes to the configured GitHub repository trigger this workflow; all corresponding project checks can also run locally before a push.

References: [Playwright web servers](https://playwright.dev/docs/test-webserver), [Playwright CI](https://playwright.dev/docs/ci-intro), [Vitest](https://vitest.dev/guide/), [React Testing Library](https://testing-library.com/docs/react-testing-library/intro/), [Prisma ORM 7 upgrade](https://www.prisma.io/docs/guides/upgrade-prisma-orm/v7).

## Teacher, Friends and content verification

The suite now has 33 backend unit tests, 11 frontend unit tests, 25 browser tests and 16 live API groups. Teacher checks compare the dashboard and report denominator, exclude hidden parents/old grades/inactive or mismatched members, distinguish unstarted topics, preserve historical submissions, and verify prefilled practice assignments. Friends checks exercise private codes, mass-assignment/ownership rejection, recipient-only acceptance, reciprocal/duplicate concurrency, notification deduplication, inactive/promoted peers, zero-XP inclusion, week boundaries and outsider exclusion. Browser tests save desktop topic and mobile teacher/Friends/leaderboard screenshots, verify invite return after login, filters, real assignment persistence and friendship removal. Curriculum checks cover all 324 grader keys and independently calculated numerical answers, plus safe correction fingerprints.

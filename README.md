# OYLA — O‘rgan O‘yla Yarat

OYLA is an Uzbek learning platform for grades 5–7. Students study lessons, answer four question types, receive educational feedback, and see server-calculated results, XP, mastery, streaks, badges, and a next lesson. Teachers manage their assigned classes and lesson assignments. Administrators manage users, classes, the full content hierarchy, publishing, XP rules, levels, and badges.

All roles have a dedicated `/profile` page with account details and name editing. Students see server-calculated learning metrics and their class; teachers see their classes and student/assignment counts. Grade and email remain under administrator control. The grade-specific catalog supplies 54 original lessons and 324 questions.

## Stack and layout

- `apps/api`: NestJS 12, TypeScript strict mode, **class-validator + class-transformer DTOs**, PostgreSQL, Prisma ORM 7.10 with `@prisma/adapter-pg`, Redis, Argon2id, JWT, rotating HttpOnly refresh cookies, OpenAPI.
- `apps/web`: React, Vite, TypeScript, Tailwind, Radix primitives styled with shadcn conventions, React Router, TanStack Query, React Hook Form, Zod, Lucide, Recharts. Inter is hosted locally.
- `docs/ARCHITECTURE.md`: specification analysis, database relationships, route/API map, design system, business formulas, and implementation plan.
- `docs/REVIEW.md`: verification results, corrected issues, and deployment limits.
- `docs/CURRICULUM.md`: grade sequences, content references, and safe seed upgrades.
- `docs/TESTING.md`: frontend tests, real browser tests, and GitHub Actions CI.

## Local development with Docker infrastructure

Prerequisites: Node.js 24 LTS, npm, Docker with a running Linux engine. Ports: web 5173, API 3001, PostgreSQL 55432, Redis 56379.

```powershell
npm ci
Copy-Item apps/api/.env.example apps/api/.env
```

Generate a random JWT secret and put it in `apps/api/.env` (do not commit secrets):

```powershell
node -e "console.log(require('node:crypto').randomBytes(48).toString('hex'))"
```

The example database password matches the development Compose service. If you change it, set `POSTGRES_PASSWORD` for Compose too. A local `apps/api/.env` intentionally overrides ambient shell values to avoid accidentally connecting to a different database. Production injects environment variables and has no `.env` file.

```powershell
npm run infra
npm run db:generate
npm run db:migrate
npm run db:seed
npm run dev
```

Prisma CLI settings live in the root `prisma.config.ts`; it points to the API schema and reads `DATABASE_URL`. The API uses Prisma's generated client with the PostgreSQL driver adapter, so run `npm run db:generate` after a clean install or schema change.

Open **http://localhost:5173**. Use the localhost hostname consistently because CORS, origin checks, and cookies use the configured `WEB_ORIGIN`.

## Windows without Docker

If PostgreSQL is installed, an isolated cluster can run from its binaries without modifying an existing service or database. The script downloads the Redis 7.4.7 Windows port from [redis-windows releases](https://github.com/redis-windows/redis-windows/releases/tag/7.4.7), checks its release checksum when supplied, and starts both services on loopback. Linux production uses the official Redis Docker image.

```powershell
npm ci
./scripts/local-infra.ps1
npm run db:generate
npm run db:migrate
npm run db:seed
npm run dev
```

The default PostgreSQL binary folder is `C:\Program Files\PostgreSQL\18\bin`; pass `-PostgresBin` for another installation. If `.env` does not exist, the script generates random database and JWT secrets. When using the isolated cluster on port 55432, the configured credentials must match that cluster. Cluster data and binaries are under ignored `.local/`; never commit them. To stop this cluster, run `pg_ctl stop -D .local/postgres -m fast` using that PostgreSQL installation. Stop Redis with its `redis-cli -p 56379 shutdown` command.

To use an existing PostgreSQL service on port 5432, configure `DATABASE_URL` in `apps/api/.env` with that service's database and application user. `local:postgres` and `local-infra.ps1` validate the configured connection instead of starting the isolated 55432 cluster. Existing data must be restored before switching the connection; changing the URL alone does not move a database.

## Development demo accounts

Seeding supports development/test environments and requires `DEMO_PASSWORD` (at least 10 characters). It never runs automatically in production. The example development password is `OylaDemo2026!`.

| Role                | Email                           |
| ------------------- | ------------------------------- |
| Student (6th grade) | student@oyla.uz                 |
| Teacher (6-A)       | teacher@oyla.uz                 |
| Teacher (6-B)       | teacher2@oyla.uz                |
| Administrator       | admin@oyla.uz                   |
| Grade 5 / Grade 7   | grade5@oyla.uz / grade7@oyla.uz |

The seed is idempotent and preserves existing user/content edits. A fresh database receives 3 subjects, 9 grade courses, 54 grade-specific lessons, 324 questions, 11 accounts, 2 classes, and one assignment. Every subject has a different sequence for grades 5, 6, and 7. Existing starter lessons with attempts, progress, assignments, or edits are retained; unused unmodified starters are archived. XP and progress are never reset or fabricated. See `docs/CURRICULUM.md` for the grade map and references. Demo credentials are for development.

## Checks

```powershell
npm run lint
npm run typecheck
npm test
npm run build
npx playwright install chromium
npm run test:browser
npm run test:e2e
npm audit
```

E2E requires a running seeded local API and checks real PostgreSQL/Redis state. It creates uniquely identified fixture users, a class, and content, then deletes only those fixtures. It tests RBAC, request validation, content publishing, answer-key secrecy, teacher ownership, assignments, all answer types, concurrent completion, XP ledger uniqueness, mastery/streaks, badges, daily rewards, refresh rotation/replay, and logout. Never target a production database. The unit suite runs without external services.

`npm test` now runs both backend and frontend unit tests. Playwright uses separate ports 3101/5180 and Redis database 1, so browser tests do not interfere with the normal app's ports or rate counters. It tests registration/login, profile editing and reload, mobile layout, role-specific profiles, grade visibility, real lesson grading, retries, and XP. The GitHub Actions workflow in `.github/workflows/ci.yml` runs all checks on pushes and pull requests; details are in `docs/TESTING.md`.

Profile API: `GET /api/v1/users/me/profile`, `PATCH /api/v1/users/me/profile` with `{ "name": "Ali Valiyev" }`. The authenticated session supplies the user ID. DTO validation rejects self-assigned role, grade, email, XP, or another user ID.

## Account roles, passwords, and notifications

In `/admin/users`, an administrator can edit an existing user's role and enable teacher access for an administrator. Moving a student to staff ends class membership while preserving profiles, attempts, XP, and progress. Becoming a student requires a grade; a teacher's classes must be reassigned before teacher access can be removed. Self-demotion and removal of the last active administrator are rejected. Authority, email, or grade changes revoke existing sessions and outstanding reset links.

All signed-in users can change their password in `/profile` by entering their current password and confirming a new password of 10–128 characters. Password changes revoke every session, consume outstanding recovery tokens, and require login again.

Password recovery works locally without email delivery. `/forgot-password` notifies active administrators when a matching active account exists and always returns the same public response. Requests for the same email are limited to one per ten minutes. An administrator verifies the user's identity and uses the key button in `/admin/users` to create and copy a recovery link. The link expires in 15 minutes, replaces older links, and can be redeemed exactly once at `/reset-password`. Only its SHA-256 hash is stored; the browser removes the URL fragment after loading. Redemption revokes all existing sessions. There is no automatic email send.

The top-bar bell opens a 400px desktop popover or a full-width mobile sheet. Its badge displays 1–9 and `9+`. All roles can filter All/Unread, follow related links, mark read/unread, mark all read, or delete their own notification from the contextual menu. The panel has loading, empty, retry, keyboard/ESC, and focus-restoration states. The `/notifications` page adds type/search filters, pagination, and Today/Yesterday/Earlier groups using Asia/Tashkent dates. Assignment, badge, account, security, system, and warning icons identify notification types. Theme tokens support light mode and a root `.dark` or `data-theme="dark"` context; no global theme toggle is added. Mutations update the list/count optimistically and roll back on errors. Unread counts refresh every 30 seconds and after changes.

API additions: `POST /api/v1/users/me/password`, `POST /api/v1/auth/password-reset/request`, `POST /api/v1/auth/password-reset/confirm`, `POST /api/v1/admin/users/:id/password-reset`, `GET /api/v1/notifications`, `GET /api/v1/notifications/unread-count`, `PATCH /api/v1/notifications/:id/read` with `{ "read": true | false }`, `PATCH /api/v1/notifications/read-all`, and `DELETE /api/v1/notifications/:id`. Notification queries accept `type`, `search`, `unreadOnly`, `page`, and `limit`. Password bodies use concrete class-validator DTOs; role/notification operations enforce RBAC and ownership on the server.

## Business rules

The first submitted answer counts toward score; retries provide learning feedback. All questions must be answered before completion. Completion locks the student's database row so concurrent calls cannot duplicate rewards. The stored completion result makes repeat completion idempotent. A lesson's XP source key is unique per student; repeating a lesson can improve the best score but earns no repeat lesson/question XP. A daily challenge snapshots five published grade-appropriate questions and can be rewarded once per Asia/Tashkent date. Daily attempts expire at the date boundary; other attempts expire after 24 hours.

Lesson XP = configured lesson completion XP + sum of correct-answer XP. A question can override the global correct-answer rule. Daily XP = configured challenge bonus + correct-answer XP. Meaningful completed learning advances streak once per local day; login does not. A seven-day milestone earns configured streak XP. Badges are deterministic and unique per user. Progress is completed visible lessons / total visible lessons. Mastery is the rounded mean of best scores in completed lessons. Weekly leaderboards aggregate the XP ledger from Monday 00:00 in Tashkent; class leaderboards require class membership or teacher ownership. See the architecture document for details.

## Backend validation and API

Every body, query object, and identifier uses a concrete DTO class. Global `ValidationPipe` enables transformation, whitelisting, unknown-field rejection, and safe field-error responses. Body strings are not silently coerced into numbers or booleans. Pagination converts query numbers explicitly. Nested question options use `ValidateNested` and `Type`. Update DTOs do not inject create defaults. The server rejects client-provided `xp`, `score`, `role` on registration, and undeclared fields. Password/token values are not included in errors or logs.

Development Swagger: **http://localhost:3001/api/docs**. Health: `/api/v1/health`. The Swagger UI is disabled in production. A typical validation response is:

```json
{
  "statusCode": 400,
  "code": "VALIDATION_ERROR",
  "message": "Kiritilgan ma’lumotlarni tekshiring.",
  "errors": [{ "field": "grade", "messages": ["grade must be an integer number"] }]
}
```

Frontend access tokens stay in memory. On reload/expiry the HttpOnly cookie rotates through `/auth/refresh`. Session revocation and current database role are checked on every authenticated request. Public registration always creates a student; administrators provision staff. Users are deactivated rather than deleting learning history. Referenced content is archived instead of deleting historical records. Lesson publishing requires a published question; student visibility also requires published topic/course/subject and the correct grade.

## Docker application and deployment

For local full-container use, set `JWT_SECRET` to a generated secret, `WEB_ORIGIN=http://localhost:8080`, and `NODE_ENV=development` in the shell or a root `.env`. Then:

```powershell
docker compose up --build -d
docker compose exec -e NODE_ENV=development -e DEMO_PASSWORD=OylaDemo2026! api node dist/prisma/seed.js
```

Open http://localhost:8080. The API image deploys checked-in migrations on startup and the web image serves a SPA through Nginx. Database/Redis volumes persist. Native PostgreSQL and Compose use the same exposed port; stop the native cluster before starting Docker PostgreSQL.

For production use a TLS reverse proxy, an HTTPS `WEB_ORIGIN`, `NODE_ENV=production`, a private API network, strong database and JWT secrets, backups, and provisioned staff accounts. Refresh cookies are Secure in production; startup rejects HTTP origins and placeholder JWT secrets. `TRUST_PROXY=1` is only for the controlled Nginx hop, which overwrites the forwarding header; leave it at 0 for direct API access. The API has no published Compose port. Redis rate counters are atomic and expire; Redis availability is required rather than silently bypassing limits. No paid external services, AI features, or email delivery are needed.

Reference documentation: [NestJS validation](https://docs.nestjs.com/techniques/validation), [class-validator](https://github.com/typestack/class-validator), [Prisma transactions](https://www.prisma.io/docs/orm/fundamentals/transactions).

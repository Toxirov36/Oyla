# OYLA MVP architecture and execution plan

## Specification analysis

Students in grades 5–7 learn Mathematics, English, and Informatics through explanations, examples, practice, and challenges. Teachers own classes, monitor actual performance, and assign lessons with automatic 24-hour deadlines. Administrators manage users, the content hierarchy, publishing, XP rules, levels, and badges. The Uzbek UI always provides a next learning action.

The server is authoritative for correctness, scores, XP, mastery, streaks, and badges. Login does not count as learning. Each lesson reward and daily reward can be claimed once. Published parents are required for student visibility. AI tutor, parent/sponsor dashboards, duels, physical rewards, and other grades are excluded. Weekly, class, and private accepted-friends leaderboards are included.

## Architecture

An npm workspace contains `apps/api` (NestJS, TypeScript, Prisma, PostgreSQL) and `apps/web` (React, Vite, TypeScript, Tailwind, React Router, TanStack Query, React Hook Form, Zod). Backend domains are auth, content, learning, progress, gamification, teacher, and admin. Each owns its controller and service. Common infrastructure provides Prisma, Redis, authorization, exception handling, and class-validator request validation. Redis stores expiring request-rate counters; PostgreSQL is the source of truth. No external paid service is needed.

Access tokens last 15 minutes and are kept in browser memory. Random rotating refresh tokens are sent via HttpOnly, SameSite=Strict cookies and stored only as SHA-256 hashes. A JWT identifies a session; authorization also verifies the current user, active session, and database role. Logout revokes the session. Only students can self-register; teachers and administrators are provisioned by administrators. Argon2id hashes passwords. Explicit DTO fields, unknown-field rejection, role guards, origin checks, Helmet, rate limits, body-size limits, safe errors, and ownership queries enforce boundaries.

## Data model

Users have student or teacher profiles, sessions, attempts, XP transactions, progress, mastery, streaks, badges, and notifications. ClassStudent connects students to teacher-owned Classes. Subject → Course (grade) → Topic → Lesson → Question → QuestionOption is the content hierarchy. Attempts snapshot question IDs and record AttemptAnswers. Assignments connect classes and lessons; AssignmentSubmission records completed attempts. Level, XpRule, Badge, and UserBadge make gamification configurable. Unique source keys in the XP ledger, unique progress rows, daily-attempt keys, and row locks prevent duplicate awards. Leaderboards aggregate historical XP transactions by date rather than storing duplicate leaderboard state.

## Routes and API

Public: `/login`, `/register`. Student: `/dashboard`, `/subjects`, `/subjects/:id`, `/lessons/:id`, `/challenge`, `/progress`, `/leaderboard`, `/badges`, `/assignments`. Teacher: `/teacher`, `/teacher/classes/:id`, `/teacher/assignments`. Admin: `/admin`, `/admin/users`, `/admin/content`, `/admin/gamification`.

All APIs use `/api/v1`. Auth: register, login, refresh, logout, me. Content: subjects, courses/:id, topics/:id, lessons/:id. Learning: attempts, attempts/:id, attempts/:id/answers, attempts/:id/complete, daily-challenge. Student: students/me, students/me/progress, students/me/assignments, badges, leaderboards. Teacher: classes, classes/:id, assignments. Admin: users, subjects, courses, topics, lessons, questions, classes, XP rules, levels, badges, analytics. Swagger documents request DTOs at `/api/docs` in development.

## Design system

Inter with a system fallback. Semantic tokens: navy #102A43, primary blue #2F80ED, success mint #19B394, purple #7B61FF, warning orange #F2994A, destructive red #EB5757, background #EAF2F8, foreground #243B53. An 8px spacing rhythm, 12–20px card radii, restrained shadows, solid primary buttons, readable forms, visible keyboard focus, accessible dialogs, and meaningful empty/error/loading states. Desktop sidebar and mobile bottom navigation. Learning is visually dominant; supporting metrics have lower emphasis. Plain-text lesson sections are safe and intentionally avoid arbitrary HTML.

## Business formulas

Teacher reports use the same visible-lesson predicate as the student dashboard. Only active students with a matching grade enter the roster. Each student's topic mastery is the rounded mean of completed best lesson scores; class topic mastery is the rounded mean of participating students' topic mastery (equal weight per student). Unstarted topics have `null` mastery and do not enter the average or the below-60% help list. Recommendations select the weakest observed lesson, or the first lesson if there are no results. Assignment completion counts current eligible members; all historical submissions remain visible.

`FriendProfile` holds a private 96-bit invite code. `Friendship` stores a canonical ordered pair, requester, PENDING/ACCEPTED status and acceptance timestamp. Database uniqueness/check constraints and ordered user locks serialize reciprocal requests and acceptance/removal. Only the recipient can accept. Mutations use class-validator DTOs, authenticated active-student guards and bounded request/friend counts. Responses expose peer ID/name/grade/active state, never peer email or invite code. The Friends XP ranking includes the current student plus accepted active students, includes zero XP and excludes pending connections. Student promotion removes social links and invalidates sessions.

Student UI: `/friends`, `/leaderboard?scope=friends`. API: GET `/friends`, POST `/friends/requests` with `{code}`, PATCH `/friends/requests/:id/accept`, DELETE `/friends/:id`, GET `/leaderboards?scope=friends`. Notifications use the `FRIEND` type. Migration: `20261007030000_friendships`.

Student class UI: `/my-class?classId=<id>`. GET `/students/me/classes` lists only the student's assigned classes matching the current grade; GET `/students/me/classes/:id` verifies membership and returns the class/teacher, active same-grade student names, friendship state and only the caller's assignment submissions. POST `/friends/classmates` takes class-validator `{classId,userId}` UUIDs and rechecks both active students' shared class and matching grades under the existing ordered user locks. It reuses the same request caps, canonical pair, notifications and recipient consent as invite-code requests; no peer invite code is exposed. `/leaderboard?scope=class&classId=<id>` retains the selected class in the URL/cache key and ranks only active students of that class's grade. Assignment cards are shared between the class and assignments pages, with deadlines displayed in Tashkent time.

Progress = completed published lessons / visible published lessons. Topic mastery = rounded mean of the student's best completed score per lesson in that topic. Subject mastery uses the same formula over that subject. The first completion awards configured lesson XP plus question-specific XP for correct answers; later attempts improve mastery without repeating XP. Daily challenge consists of five snapshotted grade-appropriate published questions; the date uses Asia/Tashkent. Daily completion awards configured challenge XP once plus correct-answer XP. One meaningful completion per local day advances streak; a gap resets it to one. Reaching a multiple of seven days awards configured streak XP once for that date. Badges use configurable deterministic criteria. Levels use configurable ascending XP thresholds.

## Implementation plan

1. Foundation: workspace, configuration, schema, migrations, class-validator, auth, RBAC.
2. Content: seeded curriculum and admin hierarchy editors/publishing.
3. Learning: server answer checking and transactional completion; student lesson interface.
4. Gamification: XP ledger, progress/mastery, streaks, badges, daily challenge, leaderboards.
5. Teacher: class ownership, student performance, assignment creation and results.
6. Polish: responsive states, accessibility, deployment/README, unit and live API tests, production builds, browser review, fix identified issues.

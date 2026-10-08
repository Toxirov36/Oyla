# Interactive learning in OYLA

Students open **Mening fanlarim → subject** to see a vertical lesson path. Lessons show available, in-progress, completed (with best score), or locked states. Desktop includes the student's current XP, streak, and daily challenge; mobile uses a single column. The existing lesson explanation and example lead into the exercise player, which presents one task at a time and server-provided feedback.

## Supported experiences

There are 18 question types: multiple choice, true/false, numerical, text, fill gap, match pairs, sort/order, drag/drop, find mistake, code completion, debug code, connect concepts, listen/answer, interactive image, memory cards, speak, draw a line, and geometry/graph point selection. Two lesson modes, **Bilim parvozi** (`MINI_GAME`) and **Mavzu sinovi** (`BOSS_BATTLE`), present the same server-graded questions with game progress. Modes do not create additional XP entitlements.

Administrators open **O‘quv kontenti → Mashqlar katalogi** (`/admin/exercises`) to try all 20 experiences. Preview validation uses `POST /api/v1/admin/exercise-preview`; it writes no attempts, progress, or XP. In the content tree, **Savol qo‘shish** opens the type-specific editor. Input lists and answer mappings are converted into validated structured definitions; no JSON editing is required. The editor also supports a preview before saving.

Existing published questions keep their original four types and answer keys. The reviewed curriculum is extended with 9 published pilot lessons and 72 exercises: one lesson per subject per grade, with eight exercises each. They appear in each course's **Interaktiv laboratoriya** topic. The idempotent content loader preserves administrator edits, attempts, progress, XP, and accounts. Catalog examples remain separate demonstrations.

| Grade | Mathematics | English | Informatics |
|---|---|---|---|
| 5 | Fractions, matching and ordering | Daily life / Present Simple | Devices and algorithms |
| 6 | Percentages and comparison | Past Simple | Algorithms and binary numbers |
| 7 | Equations and solutions | Present Perfect | Python functions and debugging |

Run `npm run db:seed:interactive` locally to install the pilots. The normal development seed also includes them. Production `release.sh` runs the compiled content-only loader after the API health check; it does not create demo users or replace existing content. Each pilot lesson has six core exercises and two enrichment exercises.

## Definitions and grading

`Question.config` contains public presentation data. `Question.grading` contains private answer keys; neither grading nor legacy `answer` is returned to learners. Every admin definition and learner payload is checked by nested `class-validator` DTOs and additional per-type structural checks. All element IDs are unique and pair/order answers must cover the definition exactly.

Structured answers use `POST /api/v1/attempts/:id/answers` with `{ questionId, payload }`. Payload has exactly one of `text`, `values`, `pairs`, or `points`, appropriate to the type. Legacy questions continue using `{ questionId, value }`. Unknown fields such as `score`, `correct`, or `xp` are rejected. `AttemptAnswer.payload` preserves structured values, while `value` retains their canonical serialization for existing reporting.

Code completion is case-sensitive. Debugging compares the corrected code including indentation; arbitrary user code is never executed. Image/geometry grading uses normalized 0–100 coordinates and a private distance tolerance; drawn lines are graded by both endpoints and can be drawn in either direction. Pointer interaction also has keyboard-accessible coordinate controls. Sort and pair interactions support keyboard/tap alternatives to dragging.

`SPEAK` records audio locally, allows playback, and uses browser speech recognition when available. Manual transcript entry is a fallback. The server grades accepted words, not acoustic pronunciation. This scope was explicitly chosen by the user. Recording is initiated only by the microphone button; temporary recordings are not uploaded. Listening supports HTTPS/local audio or browser speech synthesis.

## Versions, resume, and rewards

### Educational answer feedback

Wrong answers show **Sizning javobingiz → Nima uchun xato? → Qoida → To‘g‘ri yechim va misol**, followed by retry and continue actions. Long explanations expand with a native details control. Submitted structured answers and solutions use visible element text, not internal IDs. Pair, order and fill-gap diagnostics identify verifiable mismatches. A numerical or free-text answer alone never produces a speculative calculation/grammar diagnosis; the existing reviewed explanation is the fallback rule.

The question editor includes optional general reason, rule, solution steps (one per line, at most ten), additional example and per-wrong-option reasons. `Question.feedback` stores `{ reason?, rule?, steps?, example?, wrongAnswers?: [{ value, reason }] }`. Variant mappings must target existing incorrect choices exactly once. Feedback fields are validated nested DTOs and are excluded from public lesson/question snapshots. Admin preview uses the same server-generated panel without saving learning results. Existing questions work with their current explanation; additional examples appear when authored.

Private attempt snapshots include the question's authored feedback, so content edits cannot change explanations in an active attempt. `AttemptAnswer.feedback` stores the last submitted answer's display, solution and explanation. Retries update only this feedback and its acknowledgement, preserving the original `value`, `payload`, and `correct` used for score/XP. `GET /attempts/:id` returns feedback only for questions the authenticated owner has already answered, plus `resumeQuestionId`. Until **Keyingi savol / Natijani ko‘rish** is pressed, refreshing resumes the same question and feedback, including after a retry. `POST /attempts/:id/feedback/continue` with `{ questionId }` acknowledges an existing answer; ownership, active content and attempt expiry are enforced.

Migration `20261008120000_educational_feedback` adds private authored feedback and saved response feedback. Historical answers are marked acknowledged to preserve their previous resume behavior. Learning history, answer keys and XP remain unchanged.

New attempts store full private question snapshots, including definition version and XP override. Learner responses contain only public fields from these snapshots. Admin edits increment `Question.version` and cannot change an existing attempt's prompts or grading. The migration backfills snapshots for existing attempts. Publishing/grade visibility and the existing 24-hour attempt expiry still apply.

Unsubmitted drafts are kept in session storage for the same browser tab and restored after a refresh. Submitted answers are restored from PostgreSQL. Completed drafts are removed. Starting the same lesson resumes its active attempt; expired attempts require a new start.

The first submitted answer determines score. Further educational retries can return new feedback but do not replace that saved score. Completion, XP ledger entries, progress, badges, and streak updates remain protected by the existing user transaction lock and reward source keys.

## Prerequisites

The lesson editor accepts an optional prior lesson and a minimum score (default 70%). The prior lesson must be earlier in the same course. Cycles are rejected. Access is enforced in the lesson and attempt APIs, not just by disabling the path button. Previously completed lessons and lessons assigned to the student's class remain accessible. Existing lessons have no prerequisite and remain available until an administrator configures one. The next-lesson recommendation prefers an accessible unfinished lesson in the current course.

Completion and mastery are distinct. `Lesson.masteryScore` is the administrator-configured score needed to master that lesson (default 70%), while `unlockScore` controls its prerequisite. Results show whether the attempt reached its mastery target; the path, student progress and teacher reports count mastery from each lesson's best recorded score. A low score still records a completed lesson and can be improved by practice without another lesson reward.

Teachers see **Mashq turlari bo‘yicha tahlil** in the class view, with answer counts, accuracy, participating learners and learners below 60% for each type. The report uses first saved answers from the latest completed attempt per learner/lesson, and immutable question-type snapshots. Incomplete attempts, hidden content, other grades and learners outside the current roster are excluded. Re-checking a saved answer adds no report weight. Subject/weak-result filters apply to both topic and exercise-type reports.

## Migration and verification

Run `npm run db:generate` and `npm run db:migrate` before starting the updated API. Migration `20261007140000_interactive_exercises` adds enum values, definition fields, snapshots, structured answers, and optional lesson prerequisites without replacing learning history.

Tests cover each grading type, invalid/oversized nested payloads, code case/indentation, pair duplicates, geometry tolerance, public snapshot secrecy, all catalog interactions, both game modes, mobile overflow, browser refresh, content edits during an attempt, prerequisite enforcement, and reward idempotency. Run the existing full lint, typecheck, unit, build, browser, and API integration checks before release.

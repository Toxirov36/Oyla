# Profile photos, Brain Ring and media

These are additive features. Existing friendship requests, avatar selection, lesson modes, attempts, mastery and XP keep their previous behavior. New student routes are `/games`, `/games/memory`, `/brain-ring`, `/brain-ring/:id`, `/videos` and `/videos/:id`. Administrators manage media at `/admin/videos`.

## Profile photos

`POST /users/me/photo` accepts one multipart `file`, up to 5 MB, with no additional fields. PNG/JPEG/WebP signatures and decoding are checked, animated/executable formats are rejected, EXIF/orientation is normalized, and the image is cropped to at most 512 × 512 and re-encoded as WebP with Sharp. Only the authenticated owner's row is updated. Photos live in PostgreSQL, not a temporary upload directory; database backups include them. Each replacement has a fresh UUID.

User/profile/friend/class/ranking responses carry the effective avatar image URL while retaining the preset `avatarId`. Photo bytes and the database relation are never serialized in those responses. `GET /profile-photos/:id` requires authentication and returns `image/webp` with `private, no-store`. The shared avatar component fetches it with the existing authenticated API helper and displays a temporary blob URL. Blob URLs are revoked on unmount; query cache is scoped to the viewer and cleared by existing logout behavior. `DELETE /users/me/photo` restores the chosen preset/initials. Choosing a preset intentionally removes the photo. Nginx permits a 6 MB request only on the photo endpoint; other API requests retain the original 256 KB proxy limit.

## Brain Ring

An active student chooses an accepted active friend and optionally a subject. Existing friendship APIs are reused without changes to consent or invite-code behavior. Cross-grade matches use the lower grade and display it to both players. Five published multiple-choice/true-false questions are copied into private snapshots; original content edits do not change a running match. A pending invitation lasts five minutes, creates one notification and can be accepted/declined by the recipient or cancelled by the host. An account cannot participate in two concurrent active matches.

Acceptance starts a shared three-second countdown. Each question lasts 20 seconds; both submissions or timeout reveal the answer, followed by a three-second transition. Server timestamps govern the game, including catch-up after disconnects. No client-supplied score, winner or grade is accepted. Canonical participant locks and a match lock serialize answers; a unique `(matchId, userId, roundIndex)` prevents duplicate grading. Only the first answer counts. Neither keys, hints nor feedback are revealed before the round closes. Match endpoints return 404 to nonparticipants. Each correct answer awards ten match points; ties are supported. Match points do not enter the existing XP ledger.

Browser clients refresh an active room every 1.5 seconds and use the returned server time for countdowns. This works through the existing HTTP proxy and needs no separate socket server. Notifications link directly to the room; refresh and a second browser session resume the same match.

Only new match/photo GET requests use the separate `play-read` rate window, controlled by `PLAY_POLL_RATE_LIMIT` (default 3000/minute/IP), so a pair or a class on one connection does not consume the existing API window. Authentication and all other API limits retain their previous rules. Pending invitations are capped at three per sender and ten per recipient.

## Games and videos

The standalone **Bilim bog‘i** memory game now has three server-persisted stages with four, five and six educational pairs. The API checks guesses, resumes active rounds after refresh and prepares the next deck in the background. Gemini selects combinations from a curated grade/subject bank; no administrator approval is needed, while `/admin/memory` can pause generation and archive a faulty deck. Curated decks keep the game playable without Gemini. Moves and stage progress do not award XP or change lesson results. See [the implementation and limits](AI_MEMORY_GARDEN_PLAN.md).

Nine original animations cover mathematics, English and informatics for each of grades 5, 6 and 7. Each has four timed scenes with captions, play/pause/restart and chapter selection; optional browser narration reads the captions. Reduced-motion preferences are honored. Native animation scenes work without a third-party video service. One grade-5 English video from [British Council LearnEnglish Kids](https://www.youtube.com/watch?v=synTxcnHyrA) demonstrates the YouTube source option. External embeds load only after the user selects play and provide an external link fallback.

`GET /video-lessons` and `GET /video-lessons/:id` enforce the student's current grade and publication status. The admin catalog supports metadata editing, reviewed animation selection, YouTube ID/link parsing and draft/published/archived states. Native animation keys must match their grade and subject; YouTube sources are limited to a valid 11-character ID and the `youtube-nocookie.com` embed domain. No arbitrary HTML/iframe source is accepted. This optional library leaves the current lesson reading/exercise flow unchanged.

Migrations `20261008160000_play_and_photos` and `20261008161000_starter_videos` add new tables and independent media entries, preserving accounts, progress and administrator content. Photo handling follows [NestJS file upload](https://docs.nestjs.com/techniques/file-upload) and [Sharp input/output](https://sharp.pixelplumbing.com/api-output/) documentation. The existing npm audit advisories in Prisma tooling remain outside this additive feature; no forced major dependency downgrade was applied.

Checks cover image bytes/limits/metadata, authenticated media, preset restoration, two real clients, snapshots, concurrent/repeated answers, result/XP separation, grade visibility, animation controls, memory-game completion and media publishing.

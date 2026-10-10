# OYLA production deployment

Production runs on the existing Google Cloud VM at 34.176.204.70. The requested domain is **olya.uz**. Point its A record to that IP; remove stale AAAA records before requesting HTTPS. DNS is managed externally in Beget. Host Nginx terminates TLS and proxies `/api/` directly to the loopback API, preserving client IP and HTTPS headers. PostgreSQL, API and frontend ports bind only to localhost; Redis has no published port.

While that DNS update is pending, OYLA serves the existing HTTPS address `https://hr-recruiter.ddns.net`, with the API origin configured consistently. After the A record resolves only to 34.176.204.70, run `bash ~/oyla/current/deploy/change-domain.sh olya.uz`. This checks DNS/AAAA, obtains the new certificate, backs up Nginx configuration, updates the origin, restarts the healthy API and reloads Nginx. No new database import or application rebuild is needed.

GitHub Actions verifies the application, builds and checks the API/web Docker images, and publishes immutable commit tags to GHCR. The runtime API installs only production API dependencies. `deploy/release.sh` validates the archive, serializes releases, backs up the database before migrations, starts healthy containers and records the active commit. Source archives contain no secrets. A previous release and database dump are retained; schema rollback is deliberately manual.

On the small VM, verified releases retain only the current and previous OYLA image tags. Older OYLA tags are removed without forcing removal of any image used by a container. Registry images and database backups remain available.

Required repository secrets: DEPLOY_HOST, DEPLOY_USER, DEPLOY_SSH_KEY, DEPLOY_KNOWN_HOSTS. The production environment uses only `main`. `OYLA_DEPLOY_ENABLED=true` enables deployment after first-time database provisioning. Images can build while this flag is false. Avoid enabling deployment before the database import and `.database-ready` marker have been verified.

On the server, `/home/dilshodbektohirov40/oyla/.env` contains independently generated PostgreSQL/Redis/JWT secrets and the HTTPS WEB_ORIGIN. This file is private and never enters Git. Local learning data is imported with development sessions and password-reset tokens excluded. Known deterministic demo accounts are disabled; real account hashes, roles, teacher access, content and learning history are preserved. Database count checks and the actual administrator authority are verified after import.

To enable Google sign-in in production, add `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, and `GOOGLE_REDIRECT_URI=https://hr-recruiter.ddns.net/api/v1/auth/google/callback` to the server's private `.env`, then deploy the release. Register that exact callback in Google Cloud. Local Docker development uses `http://localhost:3001/api/v1/auth/google/callback`.

For automatic Bilim bog‘i deck preparation, put `GEMINI_API_KEY` in the private server `.env`. `GEMINI_MODEL` defaults to `gemini-2.5-flash-lite` and `MEMORY_AI_DAILY_LIMIT` defaults to 100 calls per rolling 24 hours. Without a key, curated decks remain playable. Administrators can pause generation and remove a faulty generated deck at `/admin/memory`. Apply the memory migrations before deploying the updated API.

Before retiring AI HR Recruiter, a fresh PostgreSQL dump is restored into an isolated PostgreSQL 17 container. Application, host/TLS configurations and encryption keys are archived outside the retired application directory and copied to protected local storage. Its deployment/monitoring workflows and backup timer must be disabled before old containers/volumes are removed. SSH, Docker, Nginx and the certificate renewal infrastructure are retained. This is an application replacement, not an OS reinstall.

`oyla-backup.timer` runs daily at 02:15 Tashkent time. Encrypted AES-256-GCM dumps are uploaded to the existing private R2 bucket under `database-backups/oyla/`, downloaded, authenticated and restored into an isolated PostgreSQL 18 container. Only successful restoration records `ops-state/backup.json`. Keep the separate 32-byte backup encryption key in protected offline storage. Do not delete the existing HR backup prefix. Local encrypted backups retain seven days; the OYLA R2 prefix retains thirty days after a verified successful backup.

Check services with `docker compose -p oyla --env-file ~/oyla/.env -f ~/oyla/current/deploy/compose.production.yaml ps`, `systemctl status oyla-backup.timer`, and `cat ~/oyla/ops-state/backup.json`. Set IMAGE_PREFIX and DEPLOY_SHA from the active deployment before running Compose. Never print the rendered Compose environment or private `.env` in logs.

References: [Prisma Docker deployment](https://www.prisma.io/docs/guides/deployment/docker), [Docker Node guide](https://docs.docker.com/guides/nodejs/).

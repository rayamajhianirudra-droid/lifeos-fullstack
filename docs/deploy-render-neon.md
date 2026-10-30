# Moving the backend from Railway to Render + Neon (free)

Goal: run the LifeOS backend and database for $0 with no credit card, keep
`api.lifeoshealth.com` as the address, and lose no data.

| Piece | Before | After |
|---|---|---|
| Frontend | Vercel (www.lifeoshealth.com) | Vercel, unchanged |
| Backend | Railway, EU West, paid | Render free web service (Docker), Ohio |
| Database | Railway Postgres 18, paid | Neon free, Postgres 18, AWS us-east-2 (Ohio) |
| Keep awake + alerts | none | UptimeRobot free monitor on `/api/health` |

Time needed: about 1 hour. Do it at a quiet time (late evening). Anything users
log on Railway after step 3 and before step 6 is not copied.

## What is in the repo for this

- `Dockerfile`, `.dockerignore`: builds only the backend; runs as a non-root
  user; Java memory tuned for 512 MB.
- `render.yaml`: Render Blueprint (free plan, Ohio, health check, secrets
  entered in the dashboard and never stored in git).
- `src/main/resources/application.properties`: listens on 8080 (Render is told via `PORT=8080`); small connection
  pool that lets Neon sleep when idle; graceful shutdown.
- `GET /api/health`: public, returns `{"status":"ok"}`, never touches the
  database (so the pinger does not burn Neon's free compute hours).
- `CLIENT_IP_HEADER=True-Client-IP`: on Render, traffic passes through
  Cloudflare and the last `X-Forwarded-For` entry is a shared Cloudflare
  address. Without this setting one attacker could lock everyone out of login.
- `scripts/migrate-railway-to-neon.ps1`: copies the database and checks every
  table's row count on both sides.
- `.github/workflows/ci.yml`: on every PR, runs backend tests on a real
  Postgres, boots the Docker image with 512 MB / 0.1 CPU and smoke tests it,
  and builds the frontend like Vercel does.

## Free tier limits and how we handle them

| Limit | Handling |
|---|---|
| Render sleeps after 15 min without traffic; waking takes a minute or more | UptimeRobot pings `/api/health` every 5 min |
| Render: 750 free hours per month per workspace | One service running all month is 744 hours. Do not create a second free service in the same workspace. |
| Render: 512 MB memory | Tested: peak about 330 MB under the full API test suite |
| Render may restart free services at any time | Data lives in Neon; only in-memory login rate limit counters reset |
| Render blocks SMTP ports | Email goes through Resend's HTTPS API, not SMTP |
| Neon free: 0.5 GB storage, limited compute hours per month | Pool releases idle connections so Neon scales to zero after 5 idle minutes; wake is under a second |
| Neon free: short point-in-time restore window | Take a manual backup before risky changes (script with `-KeepDump`) |
| No card on file | Going over a limit pauses the service. It can never create a bill. |

## Step by step

### 1. Merge the pull requests (in this order)
1. The audit PR (`fix/audit-accuracy`).
2. The hosting PR (`deploy/render-neon`).

Use "Create a merge commit". Railway keeps running the new master in the
meantime, so set `USDA_API_KEY` on Railway first (food search needs it).

### 2. Create the Neon database
1. Sign up at neon.com with GitHub. No card.
2. Create project: name `lifeos`, **Postgres 18**, region **AWS US East 2 (Ohio)**.
3. Do not create any tables. The database must stay empty for step 3.
4. Dashboard > Connect: turn **off** "Connection pooling" and keep this page open.
   You need the host (`ep-...us-east-2.aws.neon.tech`, no `-pooler`), the
   database name, the user and the password.

### 3. Copy the data from Railway
1. Railway > Postgres service > Settings > Networking: enable the public TCP
   proxy if it is off. Then Variables > copy `DATABASE_PUBLIC_URL`.
2. Install PostgreSQL 18 command line tools on Windows
   (postgresql.org/download/windows, select only "Command Line Tools").
3. In the repo folder run:
   ```powershell
   powershell -ExecutionPolicy Bypass -File scripts\migrate-railway-to-neon.ps1
   ```
   Paste the two connection strings when asked (input is hidden). The script
   refuses to touch a non-empty Neon database, restores in one transaction,
   then prints a table of row counts. Every row must match.
4. Turn the Railway TCP proxy off again afterwards.

### 4. Create the Render service
1. Sign up at render.com with GitHub. No card.
2. New > Blueprint > choose `lifeos-fullstack`. Render reads `render.yaml`.
   (If Blueprint asks for a card, use New > Web Service instead: Docker,
   branch `master`, region Ohio, Free plan, health check path `/api/health`,
   and add the variables below by hand.)
3. Enter the secret values:

   | Variable | Value |
   |---|---|
   | `JWT_SECRET` | Same value as on Railway, so users stay logged in |
   | `SPRING_DATASOURCE_URL` | `jdbc:postgresql://<neon host>/<db name>?sslmode=require` |
   | `SPRING_DATASOURCE_USERNAME` | Neon user |
   | `SPRING_DATASOURCE_PASSWORD` | Neon password |
   | `RESEND_API_KEY` | Same as Railway |
   | `GEMINI_API_KEY` | Same as Railway |
   | `USDA_API_KEY` | Same as Railway |
   | `CLIENT_IP_HEADER` | `True-Client-IP` (already filled by the Blueprint) |

   `VAPID_*` and `MAIL_*` are not read by the code today; do not copy them.
4. Wait for the first deploy, then open
   `https://<service>.onrender.com/api/health`. It must show `{"status":"ok"}`.
5. In Render > Logs, after your first login through the new URL, look for
   `Client IP taken from the True-Client-IP header`. A warning that the header
   is missing means the login rate limit is not per user: tell Claude.

### 5. Test before switching
Run the live checks against `https://<service>.onrender.com/api` (Claude can
run the API test suite against it). Login, food search (Big Mac about 560 kcal,
banana about 105 kcal), logging food and water, body fat, supplements, AI coach.

### 6. Switch the domain
1. Render > service > Settings > Custom Domains > add `api.lifeoshealth.com`.
   Render shows a CNAME target.
2. Where the DNS for `lifeoshealth.com` is managed, change the `api` CNAME from
   Railway's target to Render's. Remove the custom domain from Railway.
3. Wait until Render shows the certificate as issued, then open
   `https://api.lifeoshealth.com/api/health`.
4. Nothing changes on Vercel: `REACT_APP_API_URL` already points at
   `https://api.lifeoshealth.com/api`. Remove `REACT_APP_USDA_KEY` there.

### 7. Keep it awake and get alerts
1. Sign up at uptimerobot.com (free, no card).
2. New monitor: HTTP(s), URL `https://api.lifeoshealth.com/api/health`,
   interval 5 minutes, alert to your email.

### 8. Shut down Railway (after 2 or 3 days without problems)
1. Run the row count check once more if you want peace of mind.
2. Delete the Railway project (service and database).
3. Railway > Account > Billing: cancel the Hobby plan so the monthly fee stops.

## Rollback
Until step 8, Railway is untouched. Point the `api` CNAME back to Railway and
re-add the custom domain there. Data written on Render/Neon in the meantime
would need copying back (run the script with source and target swapped into
an empty database), so decide quickly.

## When LifeOS outgrows the free tier
Upgrade in place, no code changes: Render Starter (no sleep, more memory) and a
Neon paid plan. Before running more than one backend instance, move the rate
limiter counters to Redis or Postgres (see `RateLimiter.java`) and switch
schema changes from `ddl-auto=update` to Flyway migrations.

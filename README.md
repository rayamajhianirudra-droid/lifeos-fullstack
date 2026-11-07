# LifeOS Health

[![CI](https://github.com/rayamajhianirudra-droid/lifeos-fullstack/actions/workflows/ci.yml/badge.svg)](https://github.com/rayamajhianirudra-droid/lifeos-fullstack/actions/workflows/ci.yml)

A nutrition and fitness tracker with an AI coach. Live at **[www.lifeoshealth.com](https://www.lifeoshealth.com)**.

Users log meals with real USDA nutrition data and portion sizes, track water,
weight, body fat, sleep, mood, workouts and supplements, see trends over time,
and ask an AI coach for advice that is based on their own logs.

## Features

- **Food logging** backed by USDA FoodData Central: server-side search, real
  serving sizes (for example 1 sandwich, 1 medium banana) and per-portion macros.
- **Fast first load:** the app opens with one `GET /api/dashboard` call instead of 14,
  built from the existing endpoints' own handlers (same data and access checks); in a
  100-user local test every dashboard loaded in 1.1 s instead of 3.7 s. If a part fails,
  or the server is older than the app, it falls back to the separate calls.
- **Worldwide foods:** when USDA has nothing (or on request), packaged foods from
  150+ countries come from Open Food Facts, searched from our server with a cache and a
  self-imposed limit under their 10 searches a minute; type a barcode to look a product
  up; anything still missing can be added as your own food in one tap and shows up in
  later searches ([docs/world-foods.md](docs/world-foods.md)).
- **Metric or imperial:** kg and cm (or lb and ft/in) for sign-up, profile, weight log,
  body fat tape measurements and the dashboard; the first choice follows the browser's
  region and is saved to the account. Values are stored in imperial, so nothing on the
  server had to migrate; the AI coach answers in the user's units.
- **Accessible and locked down:** 0 WCAG 2.1 AA problems in an axe scan of 24 views
  (light and dark), a strict Content-Security-Policy with no inline scripts, the Inter
  font served from our own site (no Google Fonts), and dates in the user's regional
  order ([docs/accessibility-and-headers.md](docs/accessibility-and-headers.md)).
- **Your data, your call:** download everything as JSON or delete the account (password +
  "DELETE"; every row removed in one transaction, all sessions end at once), and a
  [privacy policy](https://www.lifeoshealth.com/privacy.html) ([docs/account-and-privacy.md](docs/account-and-privacy.md)).
- **Food photos** in search, the log and the dashboard: package photos from Open
  Food Facts for branded foods, Unsplash photos for the rest, cached on the server
  ([docs/food-photos.md](docs/food-photos.md)).
- **Daily targets**: calorie goal from the Mifflin-St Jeor equation with safe
  minimums, protein goal from body weight, water goal.
- **Body tracking**: weight history, body fat (US Navy method), BMI.
- **Wellness logs**: sleep, mood, exercise, supplements, custom foods.
- **Progress**: 7/30/90 day charts with goal lines, streaks, achievements, health score.
- **AI coach** (Google Gemini) that reads the user's recent logs on the server,
  with a built-in fallback coach when the AI is unavailable.
- **Admin dashboard** for the owner with aggregate stats only (see
  [docs/admin-dashboard.md](docs/admin-dashboard.md)).

## Architecture

```
Browser (React SPA, Vercel)
   |  HTTPS, JWT in Authorization header
   v
api.lifeoshealth.com  (Spring Boot in Docker, Render)
   |-- PostgreSQL (Neon, serverless)
   |-- USDA FoodData Central API (food search)
   |-- Open Food Facts (worldwide foods, barcodes, package photos; cached)
   |-- Unsplash (food photos, cached in Postgres)
   |-- Google Gemini API (AI coach, food insights)
   '-- Resend API (password reset email)
```

Frontend and backend live in this one repository:

| Path | What |
|---|---|
| `index.html`, `src/App.jsx`, `src/App.css`, `public/` | React frontend (Vite) |
| `src/main/java/lifeos_backend/` | Spring Boot backend: `controller/`, `service/`, `model/`, `repository/` |
| `src/test/java/lifeos_backend/` | Backend tests (JUnit 5, Mockito) |
| `src/App.test.jsx` | Frontend tests (Vitest, React Testing Library) |
| `Dockerfile`, `render.yaml` | Backend container and Render blueprint |
| `vite.config.js`, `eslint.config.js`, `vercel.json` | Frontend build, lint rules, Vercel settings and security headers |
| `.github/workflows/ci.yml` | CI: backend tests on Postgres, Docker smoke test, frontend lint, tests and build |
| `docs/` | Deployment runbook, admin dashboard notes |
| `scripts/` | One-off maintenance scripts (database migration) |

## Tech stack

- **Backend**: Java 21, Spring Boot 4, Spring Security, Spring Data JPA (Hibernate 7), jjwt
- **Database**: PostgreSQL 18
- **Frontend**: React 19, Vite, Recharts, Axios, Vitest, ESLint
- **Hosting**: Render (backend), Neon (database), Vercel (frontend), UptimeRobot (monitoring)
- **CI**: GitHub Actions

## Security

- Passwords hashed with BCrypt; password reset tokens are single use, expire in
  15 minutes and are stored only as hashes.
- JWT signing key comes only from the environment; the app refuses to start without one.
- Every route except sign-in, sign-up, password reset and `/api/health` requires a
  valid token. Users can only read or change their own records.
- Rate limits on login, sign-up, food search, AI coach and admin stats. Behind
  Render's proxy the real client IP is read from a trusted header.
- CORS allows only the LifeOS domains. No secrets in the repository; all keys
  are environment variables.
- Input validation on every log type (no negative or impossible values).

Found a security issue? Please email the maintainer instead of opening a public issue.

## Running locally

Requirements: Java 21, Maven (or the included `mvnw`), Node 22 (20.19 or newer), PostgreSQL.

**Backend** (port 8080)

```bash
createdb lifeos_db
export JWT_SECRET="$(openssl rand -base64 48)"   # at least 32 bytes
export RESEND_API_KEY=dev-placeholder            # real key only needed for reset emails
export USDA_API_KEY=your-key                     # free at https://fdc.nal.usda.gov/api-key-signup
export GEMINI_API_KEY=your-key                   # optional; the built-in coach works without it
export UNSPLASH_ACCESS_KEY=your-key              # optional; food photos for plain foods (https://unsplash.com/developers)
./mvnw spring-boot:run
```

The local database URL, user and password default to `localhost:5432/lifeos_db`
(see `src/main/resources/application.properties`); override them with
`SPRING_DATASOURCE_URL`, `SPRING_DATASOURCE_USERNAME` and `SPRING_DATASOURCE_PASSWORD`.

**Frontend** (port 3000)

```bash
npm ci
REACT_APP_API_URL=http://localhost:8080/api npm run dev
```

Only variables starting with `VITE_` or `REACT_APP_` are built into the
browser bundle, so backend secrets can't end up there by accident.

## Tests

```bash
./mvnw test                       # backend; needs a running Postgres and JWT_SECRET (see ci.yml)
npm test                          # frontend (Vitest)
npm run lint                      # frontend lint, warnings fail
```

CI runs both on every pull request, plus a Docker build that boots the backend
with the same 512 MB / 0.1 CPU limits as production and smoke tests login,
protected routes and memory use.

## Deployment

`master` is production. Merging a pull request deploys the backend on Render and
the frontend on Vercel. Environment variables, the database migration and the
rollback plan are in [docs/deploy-render-neon.md](docs/deploy-render-neon.md).

## License

Copyright (c) 2026 Anirudra Rayamajhi. All rights reserved. The source is
visible for review and learning; it may not be copied, redistributed or used
to run another service without written permission. See [LICENSE](LICENSE).

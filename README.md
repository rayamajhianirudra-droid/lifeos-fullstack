# LifeOS Health

[![CI](https://github.com/rayamajhianirudra-droid/lifeos-fullstack/actions/workflows/ci.yml/badge.svg)](https://github.com/rayamajhianirudra-droid/lifeos-fullstack/actions/workflows/ci.yml)

A nutrition and fitness tracker with an AI coach. Live at **[www.lifeoshealth.com](https://www.lifeoshealth.com)**.

Users log meals with real USDA nutrition data and portion sizes, track water,
weight, body fat, sleep, mood, workouts and supplements, see trends over time,
and ask an AI coach for advice that is based on their own logs.

## Features

- **Food logging** backed by USDA FoodData Central: server-side search, real
  serving sizes (for example 1 sandwich, 1 medium banana) and per-portion macros.
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
to run another service without written permission.

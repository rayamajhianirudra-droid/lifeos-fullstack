# Admin dashboard

A private page inside LifeOS for the owner. It shows totals about the app,
never one person's data.

## Turning it on
1. Render > lifeos-backend > Environment > add `ADMIN_EMAILS` with the email
   you log in with (several emails: separate with commas).
2. Save and let Render redeploy.
3. Log in on www.lifeoshealth.com. An **Admin** item appears under Account
   (and in the mobile bottom bar).

Unset `ADMIN_EMAILS` means nobody is an admin.

## What it shows
- Users: total, new in 7 and 30 days, active today / 7 days / 30 days
  (active = logged anything that day).
- Chart: sign-ups and entries logged per day for the last 30 days.
- Entries by type, all time.
- Popular foods, only foods logged by at least 3 different people.
- Food searches and AI coach messages since the last restart (in memory,
  reset on every deploy or restart).
- Database size against Neon's free 0.5 GB, server memory, uptime.

## Security and privacy
- `GET /api/admin/stats` needs a valid login like every other route.
- The server checks the email in the login token against `ADMIN_EMAILS`.
  The list lives only in the backend environment, so nobody can make
  themselves an admin from the app or the database.
- Everyone else gets 404, the same as a route that does not exist.
- Responses are `Cache-Control: no-store`; 20 requests per minute limit.
- No names, emails, ids, messages or search text are returned or stored.
- All SQL is fixed text with no user input.

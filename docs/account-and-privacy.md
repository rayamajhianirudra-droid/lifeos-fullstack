# Account deletion, data export and privacy

Required by Apple (App Store guideline 5.1.1(v): apps with accounts must let users
delete them in the app) and by GDPR / CCPA style laws (access and erasure).

## For users

Profile → **Your data**:
- **Download my data**: a `lifeos-export-YYYY-MM-DD.json` file with the profile and
  every row the user owns.
- **Delete account**: password + typing `DELETE`. Deletes the account and all data at
  once, signs out every device, and shows "Your account and all your data were deleted."

Sign-up step 2 has a required checkbox: agreement to the Privacy Policy and to storing
the health data the user logs (GDPR treats weight, food, sleep and mood as health data,
which needs explicit consent). The policy is a static page at `/privacy.html`
(`public/privacy.html`), linked from sign-up, sign-in and Profile. Contact:
privacy@lifeoshealth.com (Namecheap email forwarding).

## API

| Endpoint | Rules |
|---|---|
| `GET /api/account/export` | Login required, 5 an hour per user, `Cache-Control: no-store`, sent as an attachment |
| `DELETE /api/account` body `{"password": "...", "confirm": "DELETE"}` | Login required, 5 attempts per 15 min per user (so it cannot be used to guess passwords), 400 without `DELETE`, 403 on a wrong password, 204 when done |

## How deletion stays complete

- `AccountService.USER_TABLES` lists every table with a `user_id`. Deletion and
  export both use it, plus `plan_exercises` (through `workout_plans`),
  `password_reset_tokens` (by email) and finally `users`, all in one transaction.
- `AccountServiceTest` scans every `@Entity` and fails the build if a new table that
  stores user rows is not covered, or if a push-subscription secret column would be
  exported.
- `JwtFilter` only accepts a token while its account exists and was issued after the
  account was created, so deletion ends all sessions immediately and an old token can
  never reach a new account made later with the same email.
- Export leaves out the password hash, internal ids that link tables, and the push
  endpoint and keys.

## Tested

`account-test.js` (31 checks against a real backend and Postgres) covers:
- export contents and secrets;
- rate limits;
- the 400/403 guards;
- full removal across every table, with the other user untouched;
- sessions ending;
- re-sign-up with the same email;
- the UI download;
- the UI delete flow on a phone-sized screen;
- the privacy page.

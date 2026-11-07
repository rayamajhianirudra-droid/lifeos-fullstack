# Email setup (password reset)

Reset emails are sent through Resend. Resend's shared test sender,
`onboarding@resend.dev`, only delivers to the inbox of the Resend account owner, so
until a domain is verified **no other user receives their reset email**. The backend
prints a warning at startup while it is still using the test sender.

## One-time setup

1. Resend dashboard, **Domains**, **Add Domain**: `lifeoshealth.com`, region
   `us-east-1`.
2. Resend shows DNS records (an MX and TXT for `send`, a TXT for
   `resend._domainkey`, and optionally a `_dmarc` TXT). At Namecheap, **Domain List**,
   **Manage** next to lifeoshealth.com, **Advanced DNS**, **Add New Record** for each one,
   copying Type, Host and Value exactly. Namecheap adds `.lifeoshealth.com` to the Host
   itself, so enter only the part Resend shows before it (for example `send`).
3. Back in Resend, **Verify DNS Records**. It can take a few minutes to an hour.
4. Render, `lifeos-backend`, **Environment**: add
   `RESEND_FROM` = `LifeOS Health <noreply@lifeoshealth.com>` and save.
5. Test: on the site, "Forgot password" with an address that is not the Resend
   account owner's. The email should arrive within a minute (check spam the first time).

`RESEND_FROM` accepts `Name <address>` or a bare address; anything else falls back to
the test sender.

## What is logged

Only whether Resend accepted the email, or the HTTP status if it refused. Never the
recipient, the token or Resend's response body.

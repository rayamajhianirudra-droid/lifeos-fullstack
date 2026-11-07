# Accessibility, security headers, fonts and date formats

## Accessibility (WCAG 2.1 AA)

An axe-core 4.10.3 scan (WCAG 2 A and AA rules) covers 12 screens in light and dark
mode: sign-in, sign-up, Dashboard, Nutrition, Activity, Progress, Achievements, Body
Fat, AI Coach, Sleep, Mood, Supplements and Profile. The 2026-11-07 review found 331
problems; the scan now finds **0**.

- Grey text: `--color-ink-secondary` is `#66667C` and `--color-ink-tertiary` is
  `#6A6A80` in light mode; in dark mode they are white at 60% and 52%. That is at
  least 4.6:1 on every surface.
- Accent text: the bright accents (`--color-primary`, green, orange, blue, purple,
  coral) stay for fills, bars, icons and borders. Text uses `--color-primary-text`
  and `--text-green`, `--text-orange`, `--text-blue`, `--text-purple` and
  `--text-red`, with a darker shade in light mode and a lighter one in dark mode.
  Dashboard percentages map their accent to the text shade with `textColor()`.
- Locked achievements dim only the badge, so the title and description stay readable.
- Every input has a label. The sleep times, mood slider, supplement unit and the
  AI coach send button got one.

## Content-Security-Policy (vercel.json)

```
default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline';
img-src 'self' data: blob: https://images.unsplash.com https://images.pexels.com https://images.openfoodfacts.org https://static.openfoodfacts.org;
font-src 'self'; connect-src 'self' https://api.lifeoshealth.com; manifest-src 'self'; worker-src 'self';
object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'; upgrade-insecure-requests
```

- No inline scripts: the loading-screen script moved from index.html into
  `src/index.jsx`. It also hides the splash as soon as React has drawn, instead of
  waiting for every image plus 0.8 s.
- `'unsafe-inline'` covers styles only, which React's `style` attributes need.
- If a new outside service is ever called from the browser, add its host here.
  `csp-test.js` serves the build with these headers and fails on any violation.

Also added: `Cross-Origin-Opener-Policy: same-origin`.

## Fonts

Inter is served from our own site through `@fontsource/inter` 5.3.0 (weights 300 to 700,
Latin, Cyrillic, Greek and Vietnamese, loaded by unicode-range). Visitors' browsers no
longer contact Google Fonts, which some EU courts have treated as a personal-data
transfer.

## Date formats

The app's words are English only for now, so dates keep English month names but follow
the user's regional order (`src/dates.js`): "Sat, Nov 7" in the US, "Sat, 7 Nov" in the
UK, Germany, India and Nepal. Regions the browser has no English format for use the
day-first `en-GB`. Once the app is translated, this becomes the user's own language.

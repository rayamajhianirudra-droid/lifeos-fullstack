# Food photos

Search results, the portion picker, the food log and the dashboard's meal list show
a photo of each food.

## Where photos come from

| Food | Source | Key needed |
|---|---|---|
| Branded (has a barcode in USDA) | Open Food Facts, the real package photo, looked up by barcode | No |
| Everything else, or a barcode with no photo | A stock photo found by a simplified name ("Chicken, broiler or fryers, breast, roasted" becomes "chicken breast"): **Unsplash** ("small", 400 px wide) | `UNSPLASH_ACCESS_KEY` |
| Same, if only Pexels is configured | Pexels ("medium", about 350 px tall) | `PEXELS_API_KEY` |

Unsplash is used when its key is set. Pexels paused new API keys in November 2026,
so its code stays only for when it reopens. Without either key, plain foods show a
plate icon and everything else works.

## How it works

1. The browser shows results right away, then calls `POST /api/foods/images` with
   the food names (and barcodes) on screen. The call needs a login and is limited
   to 30 foods per request and 40 requests a minute per user.
2. The server checks the `food_images` table (shared cache, no user data). Found
   photos are kept 60 days, "no photo" answers 7 days.
3. For foods not in the cache, the server asks the sources, at most 10 new foods
   per request. Anything left over is asked for in a second request 2.5 s later.
4. Only `https://images.unsplash.com/`, `https://images.pexels.com/`,
   `https://images.openfoodfacts.org/` and `https://static.openfoodfacts.org/`
   URLs are ever returned or shown (checked on the server and again in the browser).

## Limits we stay inside

- Unsplash: 50 searches an hour while the app is in "demo" mode, 1,000 an hour
  after Unsplash approves it for production. We cap ourselves at 45 an hour
  (`UNSPLASH_PER_HOUR` raises it after approval) and pause for an hour when Unsplash
  reports fewer than 3 left. Image loads do not count, only searches.
- Pexels: 200 searches an hour. We cap at 180.
- Open Food Facts: 15 product reads a minute per IP. We cap at 10 a minute and
  identify ourselves with the `LifeOSHealth/1.0` User-Agent, as they ask.
- The cache means each food name is searched about once every 60 days, so the
  limits matter only while the cache fills up.

## Unsplash rules we follow

- Photos are shown from Unsplash's own URLs, unchanged (hotlinking is required).
- The photographer and Unsplash are credited with links carrying
  `utm_source=lifeos_health&utm_medium=referral`: "Photo by <name> on Unsplash" in
  the portion picker, on hover over any photo, and under the search results.
- We never offer photo downloads, so the download-tracking endpoint is not needed.

## Privacy

- Only the food name or barcode leaves our server. Never the user, their email
  or their log.
- Photos load with `referrerpolicy="no-referrer"`, so the photo host does not
  learn which LifeOS page asked. It does see the viewer's IP address, like any
  image on the web.
- Logs record only the source and HTTP status of a failed lookup, never the key
  or the food name.

## Setting the key on Render

1. Sign up at https://unsplash.com/developers, then "Your apps", "New Application".
   Accept the API terms and name it "LifeOS Health".
2. Copy the **Access Key** (not the Secret Key, which is never needed).
3. Render dashboard, open `lifeos-backend`, then Environment, add
   `UNSPLASH_ACCESS_KEY` with the key as its value, and save. Render redeploys.

## Applying for production (1,000 searches an hour)

When the app has real users, open the app on unsplash.com/oauth/applications and
click "Apply for Production". Unsplash checks the credits and hotlinking described
above, with screenshots of the portion picker and search results. After approval,
set `UNSPLASH_PER_HOUR=900` on Render.

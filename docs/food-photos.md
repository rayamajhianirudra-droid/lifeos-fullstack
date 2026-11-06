# Food photos

Search results, the food log and the dashboard's meal list show a photo of each food.

## Where photos come from

| Food | Source | Key needed |
|---|---|---|
| Branded (has a barcode in USDA) | Open Food Facts, the real package photo, looked up by barcode | No |
| Everything else, or a barcode with no photo | Pexels (the "medium" size, about 350 px), a stock photo found by a simplified name ("Chicken, broiler or fryers, breast, roasted" becomes "chicken breast") | `PEXELS_API_KEY` |

Without `PEXELS_API_KEY`, plain foods show a plate icon and everything else works.

## How it works

1. The browser shows results right away, then calls `POST /api/foods/images` with
   the food names (and barcodes) on screen. The call needs a login and is limited
   to 30 foods per request and 40 requests a minute per user.
2. The server checks the `food_images` table (shared cache, no user data). Found
   photos are kept 60 days, "no photo" answers 7 days.
3. For foods not in the cache, the server asks the sources, at most 10 new foods
   per request. Anything left over is asked for in a second request 2.5 s later.
4. Only `https://images.pexels.com/`, `https://images.openfoodfacts.org/` and
   `https://static.openfoodfacts.org/` URLs are ever returned or shown (checked
   on the server and again in the browser).

## Limits we stay inside

- Pexels: 200 searches an hour, 20,000 a month. We cap ourselves at 180 an hour
  and pause when Pexels reports fewer than 10 left. The cache means each food
  name is searched about once every 60 days.
- Open Food Facts: 15 product reads a minute per IP. We cap at 10 a minute and
  identify ourselves with the `LifeOSHealth/1.0` User-Agent, as they ask.

## Privacy

- Only the food name or barcode leaves our server. Never the user, their email
  or their log.
- Photos load with `referrerpolicy="no-referrer"`, so the photo host does not
  learn which LifeOS page asked. It does see the viewer's IP address, like any
  image on the web.
- Logs record only the source and HTTP status of a failed lookup, never the key
  or the food name.

## Credits

Both sources ask for credit. The search results end with "Photos: Pexels and
Open Food Facts" (links), and hovering a photo shows its credit, for example
"Photo: Jane Doe on Pexels".

## Setting the key on Render

1. Sign up at https://www.pexels.com/api/ and request a key (free, instant).
2. Render dashboard, open the `lifeos-backend` service, then Environment.
3. Add `PEXELS_API_KEY` with the key as its value and save. Render redeploys.

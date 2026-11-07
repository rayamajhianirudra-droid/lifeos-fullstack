# Worldwide foods (Open Food Facts)

USDA FoodData Central covers US foods well, but in the 2026-11-07 review it had no
match for 7 of 20 common international dishes, and its barcodes are US products only.
Open Food Facts adds packaged foods from 150+ countries (open data, ODbL, credited
under the search results).

## How a search works

1. Typed text goes to USDA first, as before.
2. If USDA finds nothing, the app searches Open Food Facts right away. If USDA did find
   something, "Not here? Search packaged foods worldwide" adds Open Food Facts results
   underneath (duplicates by barcode are dropped). They are marked "World".
3. Typed digits (8 to 14) are a barcode: `GET /api/foods/barcode/{code}`.
4. After a worldwide search, "Can't find it? Add "X" as your own food" opens the
   custom food form with the name filled in. Custom foods that match a search then
   appear first as "Your foods" chips that log in one tap. This is how home dishes
   that no database has (dal bhat, sel roti, ugali) get covered.

## Limits and privacy

Open Food Facts allows 10 searches and 15 product reads a minute per server address
and asks apps not to search as the user types. Calls go from our server, never the
browser, so users' IPs and searches stay with us, and:
- searches are capped at 8 a minute for the whole server; above that the app says
  "Worldwide search is busy right now. Please try again in a minute";
- product reads (barcodes and package photos together) share 12 a minute;
- answers are cached in memory: searches for 24 hours, products for 7 days
  (including "not found");
- every request identifies us: `LifeOSHealth/1.0 (privacy@lifeoshealth.com)`.

When usage grows past what 8 searches a minute can serve, the next step is importing
the Open Food Facts data export into our own database with a full-text index (it
needs a bigger database than Neon's free 0.5 GB).

## Data handling

`OpenFoodFactsService.normalize` maps a product to the same shape as USDA results:
- the name comes from `product_name`, then `product_name_en`, then `generic_name`;
- the brand is the first entry of `brands`;
- per-100 g values: kcal from `energy-kcal_100g`, otherwise `energy_100g` (kJ) / 4.184;
- the portions list has the label serving (`serving_quantity`) when there is one, then 100 g.

Products with no name, or with calories outside 0 to 950 per 100 g, are skipped. Text
is stripped of control characters and clipped, and macros are clamped to 0 to 100 g.

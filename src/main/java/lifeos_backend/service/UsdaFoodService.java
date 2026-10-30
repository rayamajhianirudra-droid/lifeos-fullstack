package lifeos_backend.service;

import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;
import org.springframework.web.util.UriComponentsBuilder;

import java.net.URI;
import java.time.Duration;
import java.util.*;

/**
 * Food search backed by USDA FoodData Central, called from the SERVER.
 *
 * Why server-side: the API key stays secret (it used to ship inside the website),
 * results are cached, and users get one consistent, validated format.
 *
 * Accuracy rules:
 *  - Nutrient values from FDC search are per 100 g. We return them per 100 g and
 *    attach real portions (label serving for branded foods, household measures for
 *    survey foods, plus 100 g), so the app can compute the amount actually eaten.
 *  - Energy is taken ONLY from kcal entries (nutrient 208, or the Atwater kcal
 *    variants 957/958). A kJ-only value (268) is converted (/4.184). We never use
 *    the first entry that happens to be called "Energy".
 */
@Service
public class UsdaFoodService {

    /** Overridable only for automated tests; production always uses the real USDA endpoint. */
    private static final String BASE = System.getenv().getOrDefault(
            "USDA_BASE_URL", "https://api.nal.usda.gov/fdc/v1/foods/search");
    private static final Duration TIMEOUT = Duration.ofSeconds(10);
    private static final long CACHE_TTL_MS = Duration.ofHours(24).toMillis();
    private static final int CACHE_MAX = 500;

    private final WebClient webClient = WebClient.builder()
            .codecs(c -> c.defaultCodecs().maxInMemorySize(4 * 1024 * 1024))
            .build();
    private final String apiKey = System.getenv("USDA_API_KEY");

    private record CacheEntry(long at, List<Map<String, Object>> foods) {}

    private final Map<String, CacheEntry> cache = Collections.synchronizedMap(
            new LinkedHashMap<String, CacheEntry>(128, 0.75f, true) {
                @Override
                protected boolean removeEldestEntry(Map.Entry<String, CacheEntry> e) {
                    return size() > CACHE_MAX;
                }
            });

    public boolean isConfigured() {
        return apiKey != null && !apiKey.isBlank();
    }

    /** Returns normalized foods, or null if USDA is unreachable/misconfigured. */
    @SuppressWarnings("unchecked")
    public List<Map<String, Object>> search(String rawQuery) {
        String query = rawQuery == null ? "" : rawQuery.trim().replaceAll("\\s+", " ");
        if (query.isEmpty()) return List.of();
        if (query.length() > 80) query = query.substring(0, 80);
        String key = query.toLowerCase(Locale.ROOT);

        CacheEntry hit = cache.get(key);
        if (hit != null && System.currentTimeMillis() - hit.at() < CACHE_TTL_MS) return hit.foods();
        if (!isConfigured()) {
            System.out.println("FOOD SEARCH ERROR: USDA_API_KEY is not set");
            return null;
        }

        URI uri = UriComponentsBuilder.fromUriString(BASE)
                .queryParam("query", query)                       // encoded properly ("mac & cheese" works)
                .queryParam("pageSize", 25)
                .queryParam("dataType", "Survey (FNDDS)", "Foundation", "SR Legacy", "Branded")
                .encode().build().toUri();
        try {
            Map<String, Object> resp = webClient.get().uri(uri)
                    .header("X-Api-Key", apiKey)
                    .retrieve().bodyToMono(Map.class).block(TIMEOUT);
            List<Map<String, Object>> raw = resp == null ? List.of()
                    : (List<Map<String, Object>>) resp.getOrDefault("foods", List.of());
            List<Map<String, Object>> out = new ArrayList<>();
            Set<String> seen = new HashSet<>();
            for (Map<String, Object> f : raw) {
                Map<String, Object> n = normalize(f);
                if (n == null) continue;
                String dedupe = (n.get("name") + "|" + n.getOrDefault("brand", "")).toLowerCase(Locale.ROOT);
                if (!seen.add(dedupe)) continue;                  // FDC returns many duplicates
                out.add(n);
                if (out.size() >= 15) break;
            }
            cache.put(key, new CacheEntry(System.currentTimeMillis(), out));
            return out;
        } catch (Exception e) {
            System.out.println("FOOD SEARCH ERROR: " + e.getMessage());
            return null;
        }
    }

    /** Package-private for unit tests. Returns null for foods we can't describe reliably. */
    @SuppressWarnings("unchecked")
    static Map<String, Object> normalize(Map<String, Object> f) {
        Object desc = f.get("description");
        if (desc == null) return null;
        List<Map<String, Object>> nutrients = (List<Map<String, Object>>) f.getOrDefault("foodNutrients", List.of());

        Double kcal = nutrient(nutrients, "208", "KCAL");
        if (kcal == null) kcal = nutrient(nutrients, "957", "KCAL");
        if (kcal == null) kcal = nutrient(nutrients, "958", "KCAL");
        if (kcal == null) {
            Double kj = nutrient(nutrients, "268", "KJ");
            if (kj != null) kcal = kj / 4.184;
        }
        if (kcal == null || kcal < 0 || kcal > 950) return null;  // nothing is >900 kcal/100 g (pure fat ~900)

        double protein = orZero(nutrient(nutrients, "203", "G"));
        double carbs = orZero(nutrient(nutrients, "205", "G"));
        double fat = orZero(nutrient(nutrients, "204", "G"));

        Map<String, Object> out = new LinkedHashMap<>();
        out.put("fdcId", f.get("fdcId"));
        out.put("name", tidyName(desc.toString()));
        Object brand = f.get("brandName") != null ? f.get("brandName") : f.get("brandOwner");
        if (brand != null && !brand.toString().isBlank()) out.put("brand", tidyName(brand.toString()));
        out.put("dataType", f.get("dataType"));
        out.put("per100g", Map.of(
                "calories", round1(kcal), "protein", round1(protein),
                "carbs", round1(carbs), "fat", round1(fat)));
        out.put("portions", portions(f));
        return out;
    }

    /** Real portions in grams, most useful first; always ends with "100 g". */
    @SuppressWarnings("unchecked")
    private static List<Map<String, Object>> portions(Map<String, Object> f) {
        List<Map<String, Object>> list = new ArrayList<>();
        // Branded: the label serving (e.g. "1 sandwich (219 g)")
        Object size = f.get("servingSize");
        Object unit = f.get("servingSizeUnit");
        if (size instanceof Number s && unit != null) {
            String u = unit.toString().trim().toLowerCase(Locale.ROOT);
            if ((u.equals("g") || u.equals("grm") || u.equals("ml") || u.equals("mlt")) && s.doubleValue() > 0 && s.doubleValue() < 2000) {
                Object household = f.get("householdServingFullText");
                String unitLabel = u.startsWith("m") ? "ml" : "g";
                String label = household != null && !household.toString().isBlank()
                        ? household.toString().trim().toLowerCase(Locale.ROOT) + " (" + round0(s.doubleValue()) + " " + unitLabel + ")"
                        : "1 serving (" + round0(s.doubleValue()) + " " + unitLabel + ")";
                list.add(Map.of("label", label, "grams", round1(s.doubleValue())));
            }
        }
        // Survey (FNDDS): household measures (e.g. "1 cup", "1 medium")
        List<Map<String, Object>> measures = (List<Map<String, Object>>) f.getOrDefault("foodMeasures", List.of());
        for (Map<String, Object> m : measures) {
            Object text = m.get("disseminationText");
            Object g = m.get("gramWeight");
            if (text == null || !(g instanceof Number gw) || gw.doubleValue() <= 0 || gw.doubleValue() > 2000) continue;
            String t = text.toString().trim();
            if (t.isEmpty() || t.equalsIgnoreCase("Quantity not specified")) continue;
            list.add(Map.of("label", t + " (" + round0(gw.doubleValue()) + " g)", "grams", round1(gw.doubleValue())));
            if (list.size() >= 6) break;
        }
        list.add(Map.of("label", "100 g", "grams", 100.0));
        return list;
    }

    private static Double nutrient(List<Map<String, Object>> nutrients, String number, String unit) {
        for (Map<String, Object> n : nutrients) {
            Object num = n.get("nutrientNumber");
            Object u = n.get("unitName");
            Object v = n.get("value");
            if (num != null && number.equals(num.toString()) && u != null
                    && unit.equalsIgnoreCase(u.toString()) && v instanceof Number d) {
                return d.doubleValue();
            }
        }
        return null;
    }

    /** "CHICKEN, BREAST, ROASTED" -> "Chicken, Breast, Roasted" (keeps short brand acronyms readable). */
    static String tidyName(String s) {
        String t = s.trim().replaceAll("\\s+", " ");
        if (t.length() > 120) t = t.substring(0, 120);
        boolean mostlyUpper = t.chars().filter(Character::isLetter).filter(Character::isUpperCase).count()
                > 0.7 * Math.max(1, t.chars().filter(Character::isLetter).count());
        if (!mostlyUpper) return t;
        StringBuilder b = new StringBuilder();
        boolean start = true;
        for (char c : t.toLowerCase(Locale.ROOT).toCharArray()) {
            b.append(start && Character.isLetter(c) ? Character.toUpperCase(c) : c);
            start = !Character.isLetterOrDigit(c) && c != '\'';
        }
        return b.toString();
    }

    private static double orZero(Double d) { return d == null || d < 0 ? 0 : d; }
    private static double round1(double d) { return Math.round(d * 10) / 10.0; }
    private static long round0(double d) { return Math.round(d); }
}

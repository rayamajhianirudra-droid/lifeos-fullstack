package lifeos_backend.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;
import org.springframework.web.reactive.function.client.WebClientResponseException;

import java.time.Duration;
import java.time.Instant;
import java.util.*;

/**
 * Worldwide packaged foods from Open Food Facts (3M+ products from 150+ countries,
 * ODbL / CC BY-SA, credited in the app), used where USDA has nothing: foods sold
 * outside the US, and barcode lookups.
 *
 * Calls go from our SERVER (the user's IP and searches stay with us) and must respect
 * Open Food Facts' limits per server address: 10 searches and 15 product reads a
 * minute, and "don't use it for search-as-you-type". So:
 *  - the app only searches worldwide when USDA found nothing or the user asks for it;
 *  - searches are capped at 8 a minute and product reads share one 12-a-minute budget
 *    with the photo lookups (FoodImageService);
 *  - answers are cached in memory (searches 24 h, products 7 days).
 * When the budget is used up, search() and product() return BUSY and the app says
 * "try again in a minute" instead of hitting Open Food Facts anyway.
 *
 * Results use the same shape as UsdaFoodService.normalize so the app treats them alike.
 */
@Service
public class OpenFoodFactsService {

    private static final Logger log = LoggerFactory.getLogger(OpenFoodFactsService.class);

    static final String USER_AGENT = "LifeOSHealth/1.0 (privacy@lifeoshealth.com)";
    /** Shared with FoodImageService so both together stay under 15 product reads a minute. */
    public static final String PRODUCT_BUDGET_KEY = "off:product";
    public static final int PRODUCT_BUDGET_PER_MINUTE = 12;
    private static final String SEARCH_BUDGET_KEY = "off:search";
    private static final int SEARCH_BUDGET_PER_MINUTE = 8;

    private static final String SEARCH_URL = System.getenv().getOrDefault(
            "OFF_SEARCH_URL", "https://world.openfoodfacts.org/cgi/search.pl");
    private static final String PRODUCT_BASE = System.getenv().getOrDefault(
            "OFF_BASE_URL", "https://world.openfoodfacts.org/api/v2/product/");
    private static final String FIELDS =
            "code,product_name,product_name_en,generic_name,brands,nutriments,serving_quantity,serving_size";
    private static final Duration TIMEOUT = Duration.ofSeconds(6);

    /** Marker for "over our own budget, try again shortly" (compared by identity, never a shared empty list). */
    public static final List<Map<String, Object>> BUSY = Collections.unmodifiableList(new ArrayList<>(0));

    private final RateLimiter limiter;
    private final WebClient web = WebClient.builder()
            .codecs(c -> c.defaultCodecs().maxInMemorySize(4 * 1024 * 1024))
            .defaultHeader("User-Agent", USER_AGENT)
            .build();
    private final TtlCache<List<Map<String, Object>>> searches = new TtlCache<>(300, Duration.ofHours(24));
    private final TtlCache<Optional<Map<String, Object>>> products = new TtlCache<>(1000, Duration.ofDays(7));

    public OpenFoodFactsService(RateLimiter limiter) {
        this.limiter = limiter;
    }

    /** Foods matching the words, BUSY when our budget is used up, null if Open Food Facts failed. */
    @SuppressWarnings("unchecked")
    public List<Map<String, Object>> search(String query) {
        String q = query == null ? "" : query.trim().replaceAll("\\s+", " ").toLowerCase(Locale.ROOT);
        if (q.isEmpty() || q.length() > 80) return List.of();
        List<Map<String, Object>> hit = searches.get(q);
        if (hit != null) return hit;
        if (!limiter.tryAcquire(SEARCH_BUDGET_KEY, SEARCH_BUDGET_PER_MINUTE, Duration.ofMinutes(1))) return BUSY;
        try {
            Map<String, Object> body = web.get()
                    .uri(SEARCH_URL, b -> b
                            .queryParam("search_terms", q)
                            .queryParam("search_simple", 1)
                            .queryParam("action", "process")
                            .queryParam("json", 1)
                            .queryParam("page_size", 20)
                            .queryParam("fields", FIELDS)
                            .build())
                    .retrieve()
                    .bodyToMono(Map.class)
                    .block(TIMEOUT);
            List<Map<String, Object>> out = new ArrayList<>();
            Object list = body == null ? null : body.get("products");
            if (list instanceof List<?> ps) {
                Set<String> seen = new HashSet<>();
                for (Object o : ps) {
                    if (!(o instanceof Map<?, ?> p)) continue;
                    Map<String, Object> food = normalize((Map<String, Object>) p);
                    if (food != null && seen.add(food.get("name") + "|" + food.getOrDefault("brand", ""))) out.add(food);
                    if (out.size() >= 12) break;
                }
            }
            searches.put(q, out);
            return out;
        } catch (WebClientResponseException e) {
            log.warn("OPEN FOOD FACTS ERROR: search HTTP {}", e.getStatusCode().value());
            return null;
        } catch (Exception e) {
            log.warn("OPEN FOOD FACTS ERROR: search {}", e.getClass().getSimpleName());
            return null;
        }
    }

    /**
     * One product by barcode: Optional.empty() when Open Food Facts does not have it
     * (or it has no usable nutrition), null when over budget or Open Food Facts failed.
     */
    @SuppressWarnings("unchecked")
    public Optional<Map<String, Object>> product(String barcode) {
        String code = normalizeBarcode(barcode);
        if (code == null) return Optional.empty();
        Optional<Map<String, Object>> hit = products.get(code);
        if (hit != null) return hit;
        if (!limiter.tryAcquire(PRODUCT_BUDGET_KEY, PRODUCT_BUDGET_PER_MINUTE, Duration.ofMinutes(1))) return null;
        try {
            Map<String, Object> body = web.get()
                    .uri(PRODUCT_BASE + code + "?fields=" + FIELDS)
                    .retrieve()
                    .bodyToMono(Map.class)
                    .block(TIMEOUT);
            Object p = body == null ? null : body.get("product");
            Optional<Map<String, Object>> result = p instanceof Map<?, ?> m
                    ? Optional.ofNullable(normalize((Map<String, Object>) m))
                    : Optional.empty();
            products.put(code, result);
            return result;
        } catch (WebClientResponseException e) {
            if (e.getStatusCode().value() == 404) {
                products.put(code, Optional.empty());
                return Optional.empty();
            }
            log.warn("OPEN FOOD FACTS ERROR: product HTTP {}", e.getStatusCode().value());
            return null;
        } catch (Exception e) {
            log.warn("OPEN FOOD FACTS ERROR: product {}", e.getClass().getSimpleName());
            return null;
        }
    }

    /** 8 to 14 digits; 12-digit UPC-A becomes the 13-digit EAN Open Food Facts files it under. */
    public static String normalizeBarcode(String raw) {
        if (raw == null) return null;
        String d = raw.trim();
        if (!d.matches("\\d{8,14}") || d.chars().allMatch(c -> c == '0')) return null;
        return d.length() == 12 ? "0" + d : d;
    }

    /** Open Food Facts product -> the app's food shape, or null if it lacks a name or usable calories. */
    @SuppressWarnings("unchecked")
    static Map<String, Object> normalize(Map<String, Object> p) {
        String name = firstText(p, "product_name", "product_name_en", "generic_name");
        if (name == null) return null;
        Map<String, Object> n = p.get("nutriments") instanceof Map<?, ?> m ? (Map<String, Object>) m : Map.of();
        Double kcal = num(n.get("energy-kcal_100g"));
        if (kcal == null) {
            Double kj = num(n.get("energy-kj_100g"));
            if (kj == null) kj = num(n.get("energy_100g"));   // energy_100g is in kJ
            if (kj != null) kcal = kj / 4.184;
        }
        if (kcal == null || kcal < 0 || kcal > 950) return null;
        double protein = clamp(num(n.get("proteins_100g")));
        double carbs = clamp(num(n.get("carbohydrates_100g")));
        double fat = clamp(num(n.get("fat_100g")));
        String code = p.get("code") == null ? null : normalizeBarcode(p.get("code").toString());

        Map<String, Object> out = new LinkedHashMap<>();
        out.put("fdcId", null);
        out.put("id", code != null ? "off:" + code : "off:" + Integer.toHexString((name + kcal).hashCode()));
        out.put("name", name);
        String brands = text(p.get("brands"));
        if (brands != null) out.put("brand", clip(brands.split(",")[0].trim(), 60));
        out.put("dataType", "Open Food Facts");
        out.put("source", "openfoodfacts");
        if (code != null) out.put("upc", code);
        out.put("per100g", Map.of("calories", round1(kcal), "protein", round1(protein),
                "carbs", round1(carbs), "fat", round1(fat)));

        List<Map<String, Object>> portions = new ArrayList<>();
        Double servingG = num(p.get("serving_quantity"));
        if (servingG != null && servingG > 0 && servingG < 2000) {
            String label = text(p.get("serving_size"));
            portions.add(Map.of("label", label != null ? "1 serving (" + clip(label, 30) + ")" : "1 serving (" + round1(servingG) + " g)",
                    "grams", round1(servingG)));
        }
        portions.add(Map.of("label", "100 g", "grams", 100.0));
        out.put("portions", portions);
        return out;
    }

    private static String firstText(Map<String, Object> p, String... keys) {
        for (String k : keys) {
            String t = text(p.get(k));
            if (t != null) return clip(t, 120);
        }
        return null;
    }

    /** Trimmed text without control characters, or null when empty. */
    private static String text(Object o) {
        if (o == null) return null;
        String t = o.toString().replaceAll("\\p{Cntrl}", " ").replaceAll("\\s+", " ").trim();
        return t.isEmpty() ? null : t;
    }

    private static Double num(Object o) {
        if (o instanceof Number x) return Double.isFinite(x.doubleValue()) ? x.doubleValue() : null;
        if (o instanceof String s) {
            try {
                double d = Double.parseDouble(s.trim().replace(',', '.'));
                return Double.isFinite(d) ? d : null;
            } catch (NumberFormatException e) {
                return null;
            }
        }
        return null;
    }

    private static double clamp(Double v) { return v == null || v < 0 ? 0 : Math.min(v, 100); }
    private static double round1(double v) { return Math.round(v * 10) / 10.0; }
    private static String clip(String s, int max) { return s.length() > max ? s.substring(0, max).trim() : s; }

    /** Small thread-safe LRU cache with a time limit per entry. */
    static final class TtlCache<V> {
        private record Slot<V>(V value, Instant expires) {}
        private final Map<String, Slot<V>> map;
        private final Duration ttl;

        TtlCache(int max, Duration ttl) {
            this.ttl = ttl;
            this.map = Collections.synchronizedMap(new LinkedHashMap<>(64, 0.75f, true) {
                @Override protected boolean removeEldestEntry(Map.Entry<String, Slot<V>> e) { return size() > max; }
            });
        }

        V get(String k) {
            Slot<V> e = map.get(k);
            if (e == null) return null;
            if (e.expires().isBefore(Instant.now())) { map.remove(k); return null; }
            return e.value();
        }

        void put(String k, V v) { map.put(k, new Slot<>(v, Instant.now().plus(ttl))); }
    }
}

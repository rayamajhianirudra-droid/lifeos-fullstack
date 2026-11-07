package lifeos_backend.service;

import lifeos_backend.model.FoodImage;
import lifeos_backend.repository.FoodImageRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

import java.time.Duration;
import java.time.Instant;
import java.util.*;
import java.util.regex.Pattern;

/**
 * Finds a photo for each food the user sees, called from the SERVER so API keys stay
 * secret and every user shares one cache.
 *
 * Sources, in order:
 *  1. Open Food Facts, by barcode, for branded foods: the real package photo.
 *     Free, no key. Images are CC BY-SA; the app credits "Open Food Facts".
 *  2. A stock photo found by a simplified food name ("Chicken, broiler or fryers,
 *     breast, roasted" becomes "chicken breast"), from Unsplash when
 *     UNSPLASH_ACCESS_KEY is set, otherwise Pexels when PEXELS_API_KEY is set.
 *     With neither key this step is skipped and nothing breaks.
 *
 * Privacy: only the food name or barcode leaves the server, never anything about the
 * user. Results (found or not) are cached in the food_images table so the external
 * services are asked about each food once in a long while, which also keeps us far
 * inside their free limits (Open Food Facts asks for at most 15 product reads a
 * minute, Unsplash allows 50 searches an hour before production approval, Pexels 200).
 *
 * Only https URLs on the sources' own image hosts are ever returned to the browser.
 */
@Service
public class FoodImageService {

    private static final Logger log = LoggerFactory.getLogger(FoodImageService.class);

    /** Overridable only for automated tests; production always uses the real endpoints. */
    private static final String PEXELS_BASE = System.getenv().getOrDefault(
            "PEXELS_BASE_URL", "https://api.pexels.com/v1/search");
    private static final String UNSPLASH_BASE = System.getenv().getOrDefault(
            "UNSPLASH_BASE_URL", "https://api.unsplash.com/search/photos");
    /** Unsplash asks every credit link to carry these, so photographers see where views come from. */
    static final String UNSPLASH_UTM = "utm_source=lifeos_health&utm_medium=referral";
    private static final String OFF_BASE = System.getenv().getOrDefault(
            "OFF_BASE_URL", "https://world.openfoodfacts.org/api/v2/product/");
    /** Open Food Facts asks every app to identify itself. */
    private static final String USER_AGENT = OpenFoodFactsService.USER_AGENT;

    static final List<String> ALLOWED_IMAGE_PREFIXES = List.of(
            "https://images.pexels.com/",
            "https://images.unsplash.com/",
            "https://images.openfoodfacts.org/",
            "https://static.openfoodfacts.org/");

    private static final Duration HIT_TTL = Duration.ofDays(60);
    private static final Duration MISS_TTL = Duration.ofDays(7);
    private static final Duration CALL_TIMEOUT = Duration.ofSeconds(4);
    private static final Duration BATCH_TIMEOUT = Duration.ofSeconds(7);
    /** New external lookups per request; the rest are fetched on later requests. */
    static final int MAX_NEW_PER_REQUEST = 10;
    private static final int PEXELS_PER_HOUR = 180;
    /** Unsplash allows 50 searches an hour until the app is approved for production (then 1,000). */
    private static final int UNSPLASH_PER_HOUR = intEnv("UNSPLASH_PER_HOUR", 45);

    private static final Pattern DIGITS = Pattern.compile("\\d{8,14}");

    private final FoodImageRepository repo;
    private final RateLimiter limiter;
    private final WebClient webClient = WebClient.builder()
            .codecs(c -> c.defaultCodecs().maxInMemorySize(512 * 1024))
            .defaultHeader("User-Agent", USER_AGENT)
            .build();
    private final String pexelsKey = trimOrNull(System.getenv("PEXELS_API_KEY"));
    /** Unsplash "Access Key" (public id of the app); the Secret Key is never needed here. */
    private final String unsplashKey = trimOrNull(System.getenv("UNSPLASH_ACCESS_KEY"));
    private volatile long unsplashPausedUntil = 0;
    /** When Pexels says the hourly quota is nearly used up, wait until it resets. */
    private volatile long pexelsPausedUntil = 0;

    public FoodImageService(FoodImageRepository repo, RateLimiter limiter) {
        this.repo = repo;
        this.limiter = limiter;
    }

    /** One food shown in the app. id is chosen by the caller and echoed back. */
    public record Item(String id, String name, String upc) {}

    /** What the browser gets for one food. */
    public record Photo(String url, String credit, String creditUrl, String source) {}

    /** Returns id -> photo for the foods that have one. Never throws. */
    public Map<String, Photo> photosFor(List<Item> items) {
        Map<String, Photo> out = new LinkedHashMap<>();
        try {
            // Work out the cache keys each item can use: barcode first, then name.
            Map<String, List<String>> keysById = new LinkedHashMap<>();
            Set<String> allKeys = new LinkedHashSet<>();
            for (Item it : items) {
                List<String> keys = new ArrayList<>(2);
                String upc = normalizeUpc(it.upc());
                if (upc != null) keys.add("upc:" + upc);
                String term = term(it.name());
                if (term != null) keys.add(term);
                if (!keys.isEmpty()) {
                    keysById.put(it.id(), keys);
                    allKeys.addAll(keys);
                }
            }
            if (allKeys.isEmpty()) return out;

            Map<String, FoodImage> cached = new HashMap<>();
            for (FoodImage fi : repo.findAllById(allKeys)) {
                if (fresh(fi)) cached.put(fi.getTerm(), fi);
            }

            // For each food, the first key that has no cached answer yet (the name is only
            // tried once the barcode is known to have no photo), at most a few per request.
            List<String> missing = new ArrayList<>();
            for (List<String> keys : keysById.values()) {
                if (missing.size() >= MAX_NEW_PER_REQUEST) break;
                String next = nextKeyToLookUp(keys, cached);
                if (next != null && !missing.contains(next)) missing.add(next);
            }
            if (!missing.isEmpty()) {
                List<FoodImage> fetched = Flux.fromIterable(missing)
                        .flatMap(this::lookup, 4)
                        .collectList()
                        .block(BATCH_TIMEOUT);
                if (fetched != null) {
                    for (FoodImage fi : fetched) cached.put(fi.getTerm(), fi);
                    save(fetched);
                }
            }

            List<FoodImage> aliases = new ArrayList<>();
            for (Map.Entry<String, List<String>> e : keysById.entrySet()) {
                List<String> keys = e.getValue();
                for (String k : keys) {
                    FoodImage fi = cached.get(k);
                    if (fi != null && fi.isFound() && isAllowedImageUrl(fi.getUrl())) {
                        out.put(e.getKey(), new Photo(fi.getUrl(), fi.getCreditName(), fi.getCreditUrl(), fi.getSource()));
                        // A logged food is later shown by name only, so remember the
                        // package photo under its name too (unless the name has its own).
                        String nameKey = keys.get(keys.size() - 1);
                        if (k.startsWith("upc:") && !nameKey.startsWith("upc:") && !cached.containsKey(nameKey)) {
                            FoodImage alias = new FoodImage(nameKey, fi.getUrl(), fi.getCreditName(),
                                    fi.getCreditUrl(), fi.getSource(), true);
                            cached.put(nameKey, alias);
                            aliases.add(alias);
                        }
                        break;
                    }
                }
            }
            save(aliases);
        } catch (Exception e) {
            log.warn("FOOD PHOTO ERROR: {}: {}", e.getClass().getSimpleName(), e.getMessage());
        }
        return out;
    }

    /** The first key with no cached answer, or null if a photo is cached or every key is a known miss. */
    static String nextKeyToLookUp(List<String> keys, Map<String, FoodImage> cached) {
        for (String k : keys) {
            FoodImage fi = cached.get(k);
            if (fi == null) return k;
            if (fi.isFound()) return null;
        }
        return null;
    }

    private static boolean fresh(FoodImage fi) {
        if (fi.getFetchedAt() == null) return false;
        Duration ttl = fi.isFound() ? HIT_TTL : MISS_TTL;
        return fi.getFetchedAt().plus(ttl).isAfter(Instant.now());
    }

    private void save(List<FoodImage> rows) {
        for (FoodImage fi : rows) {
            try {
                repo.save(fi);
            } catch (Exception e) {
                // Another request saved the same food at the same moment: fine, keep theirs.
            }
        }
    }

    /** Empty when the source could not be asked or failed: nothing is cached then, so we retry later. */
    private Mono<FoodImage> lookup(String key) {
        if (key.startsWith("upc:")) return openFoodFacts(key);
        // Unsplash when its key is set, otherwise Pexels (Pexels paused new keys in Nov 2026).
        return unsplashKey != null ? unsplash(key) : pexels(key);
    }

    @SuppressWarnings("unchecked")
    private Mono<FoodImage> openFoodFacts(String key) {
        if (!limiter.tryAcquire(OpenFoodFactsService.PRODUCT_BUDGET_KEY, OpenFoodFactsService.PRODUCT_BUDGET_PER_MINUTE, Duration.ofMinutes(1))) return Mono.empty();
        String code = key.substring(4);
        return webClient.get()
                .uri(OFF_BASE + code + "?fields=image_front_small_url")
                .exchangeToMono(resp -> {
                    if (resp.statusCode().value() == HttpStatus.NOT_FOUND.value()) {
                        return resp.releaseBody().thenReturn(miss(key, "openfoodfacts"));
                    }
                    if (!resp.statusCode().is2xxSuccessful()) {
                        log.warn("FOOD PHOTO ERROR: Open Food Facts {}", resp.statusCode().value());
                        return resp.releaseBody().then(Mono.empty());
                    }
                    return resp.bodyToMono(Map.class).map(body -> {
                        Object product = body.get("product");
                        Object url = product instanceof Map<?, ?> p ? p.get("image_front_small_url") : null;
                        if (url instanceof String u && isAllowedImageUrl(u)) {
                            return new FoodImage(key, u, "Open Food Facts",
                                    "https://world.openfoodfacts.org/product/" + code, "openfoodfacts", true);
                        }
                        return miss(key, "openfoodfacts");
                    });
                })
                .timeout(CALL_TIMEOUT)
                .onErrorResume(e -> {
                    log.warn("FOOD PHOTO ERROR: Open Food Facts {}", e.getClass().getSimpleName());
                    return Mono.empty();
                });
    }

    @SuppressWarnings("unchecked")
    private Mono<FoodImage> pexels(String term) {
        if (pexelsKey == null) return Mono.empty();
        if (System.currentTimeMillis() < pexelsPausedUntil) return Mono.empty();
        if (!limiter.tryAcquire("photos:pexels", PEXELS_PER_HOUR, Duration.ofHours(1))) return Mono.empty();
        return webClient.get()
                .uri(PEXELS_BASE, b -> b
                        .queryParam("query", term + " food")
                        .queryParam("per_page", 1)
                        .queryParam("orientation", "square")
                        .build())
                .header("Authorization", pexelsKey)
                .exchangeToMono(resp -> {
                    rememberQuota(resp.headers().header("X-Ratelimit-Remaining"),
                            resp.headers().header("X-Ratelimit-Reset"));
                    if (resp.statusCode().value() == 429) {
                        pexelsPausedUntil = System.currentTimeMillis() + Duration.ofMinutes(15).toMillis();
                    }
                    if (!resp.statusCode().is2xxSuccessful()) {
                        // Status only: never the key or the food name.
                        log.warn("FOOD PHOTO ERROR: Pexels {}", resp.statusCode().value());
                        return resp.releaseBody().then(Mono.empty());
                    }
                    return resp.bodyToMono(Map.class).map(body -> {
                        Object photos = body.get("photos");
                        if (photos instanceof List<?> list && !list.isEmpty() && list.get(0) instanceof Map<?, ?> p) {
                            Object src = p.get("src");
                            // "medium" is about 350 px tall: sharp on phone and retina screens
                            // ("tiny" at 200 px looked soft). Fall back to "small" if missing.
                            Object medium = src instanceof Map<?, ?> s ? (s.get("medium") != null ? s.get("medium") : s.get("small")) : null;
                            if (medium instanceof String u && isAllowedImageUrl(u)) {
                                String who = p.get("photographer") instanceof String n ? clip(n, 120) : "Pexels";
                                String page = p.get("url") instanceof String pu && pu.startsWith("https://www.pexels.com/")
                                        ? clip(pu, 500) : "https://www.pexels.com";
                                return new FoodImage(term, u, who, page, "pexels", true);
                            }
                        }
                        return miss(term, "pexels");
                    });
                })
                .timeout(CALL_TIMEOUT)
                .onErrorResume(e -> {
                    log.warn("FOOD PHOTO ERROR: Pexels {}", e.getClass().getSimpleName());
                    return Mono.empty();
                });
    }

    @SuppressWarnings("unchecked")
    private Mono<FoodImage> unsplash(String term) {
        if (System.currentTimeMillis() < unsplashPausedUntil) return Mono.empty();
        if (!limiter.tryAcquire("photos:unsplash", UNSPLASH_PER_HOUR, Duration.ofHours(1))) return Mono.empty();
        return webClient.get()
                .uri(UNSPLASH_BASE, b -> b
                        .queryParam("query", term + " food")
                        .queryParam("per_page", 1)
                        .queryParam("orientation", "squarish")
                        .queryParam("content_filter", "high")
                        .build())
                .header("Authorization", "Client-ID " + unsplashKey)
                .header("Accept-Version", "v1")
                .exchangeToMono(resp -> {
                    // No reset time is sent: the quota refills within the hour.
                    List<String> left = resp.headers().header("X-Ratelimit-Remaining");
                    try {
                        if (!left.isEmpty() && Integer.parseInt(left.get(0).trim()) < 3) {
                            unsplashPausedUntil = System.currentTimeMillis() + Duration.ofHours(1).toMillis();
                        }
                    } catch (NumberFormatException ignored) {
                        // Odd header: rely on our own hourly limit.
                    }
                    if (resp.statusCode().value() == 429 || resp.statusCode().value() == 403) {
                        unsplashPausedUntil = System.currentTimeMillis() + Duration.ofMinutes(30).toMillis();
                    }
                    if (!resp.statusCode().is2xxSuccessful()) {
                        log.warn("FOOD PHOTO ERROR: Unsplash {}", resp.statusCode().value());
                        return resp.releaseBody().then(Mono.empty());
                    }
                    return resp.bodyToMono(Map.class).map(body -> {
                        Object results = body.get("results");
                        if (results instanceof List<?> list && !list.isEmpty() && list.get(0) instanceof Map<?, ?> p) {
                            Object urls = p.get("urls");
                            // "small" is 400 px wide; Unsplash requires using its URLs as given (they keep ixid).
                            Object small = urls instanceof Map<?, ?> m ? m.get("small") : null;
                            if (small instanceof String u && isAllowedImageUrl(u)) {
                                Object user = p.get("user");
                                String who = "Unsplash";
                                String page = "https://unsplash.com/?" + UNSPLASH_UTM;
                                if (user instanceof Map<?, ?> um) {
                                    if (um.get("name") instanceof String n && !n.isBlank()) who = clip(n, 120);
                                    Object links = um.get("links");
                                    if (links instanceof Map<?, ?> lm && lm.get("html") instanceof String h
                                            && h.startsWith("https://unsplash.com/") && h.length() < 400 && !h.contains("?")) {
                                        page = h + "?" + UNSPLASH_UTM;
                                    }
                                }
                                return new FoodImage(term, u, who, page, "unsplash", true);
                            }
                        }
                        return miss(term, "unsplash");
                    });
                })
                .timeout(CALL_TIMEOUT)
                .onErrorResume(e -> {
                    log.warn("FOOD PHOTO ERROR: Unsplash {}", e.getClass().getSimpleName());
                    return Mono.empty();
                });
    }

    private void rememberQuota(List<String> remaining, List<String> reset) {
        try {
            if (remaining.isEmpty()) return;
            int left = Integer.parseInt(remaining.get(0).trim());
            if (left < 10) {
                long until = reset.isEmpty() ? System.currentTimeMillis() + Duration.ofHours(1).toMillis()
                        : Long.parseLong(reset.get(0).trim()) * 1000L;
                pexelsPausedUntil = Math.min(until, System.currentTimeMillis() + Duration.ofDays(31).toMillis());
            }
        } catch (NumberFormatException ignored) {
            // Header missing or odd: rely on our own hourly limit.
        }
    }

    private static FoodImage miss(String key, String source) {
        return new FoodImage(key, null, null, null, source, false);
    }

    // ── Helpers (package-private for unit tests) ────────────────────────────────

    static boolean isAllowedImageUrl(String url) {
        if (url == null || url.length() > 500) return false;
        if (url.contains("\"") || url.contains("'") || url.contains("<") || url.contains(" ")) return false;
        for (String p : ALLOWED_IMAGE_PREFIXES) if (url.startsWith(p)) return true;
        return false;
    }

    /** USDA gives 12-digit UPC-A codes; Open Food Facts files them as 13-digit EAN with a leading 0. */
    static String normalizeUpc(String upc) {
        if (upc == null) return null;
        String d = upc.trim();
        if (!DIGITS.matcher(d).matches()) return null;
        if (d.chars().allMatch(c -> c == '0')) return null;
        return d.length() == 12 ? "0" + d : d;
    }

    /** Words that describe preparation or USDA bookkeeping, not what the food looks like. */
    private static final Set<String> STOP = Set.of(
            "raw", "cooked", "boiled", "baked", "roasted", "grilled", "fried", "broiled", "steamed", "stewed",
            "nfs", "ns", "as", "to", "form", "of", "or", "and", "with", "without", "from", "in", "the", "a", "an",
            "salt", "added", "fat", "meat", "only", "skin", "eaten", "boneless", "skinless", "fresh", "frozen",
            "canned", "drained", "solids", "prepared", "ready", "eat", "rte", "unprepared", "dry", "whole",
            "broiler", "broilers", "fryer", "fryers", "all", "classes", "varieties", "commercial", "regular",
            "plain", "unenriched", "enriched", "includes", "include", "separable", "lean", "trimmed", "choice",
            "select", "grade", "unheated", "heated", "low", "reduced", "sodium", "free", "type", "style", "made",
            "home", "recipe", "restaurant", "fast", "foods", "food", "brand", "large", "medium", "small", "pieces",
            "sliced", "diced", "chopped", "unsalted", "salted", "sweetened", "unsweetened", "light", "lite");

    /**
     * "Chicken, broiler or fryers, breast, meat only, cooked, roasted" -> "chicken breast".
     * "Oreo Cookies (Nabisco)" -> "oreo cookies". Returns null when nothing is left.
     */
    static String term(String name) {
        if (name == null) return null;
        String s = name.toLowerCase(Locale.ROOT)
                .replaceAll("\\([^)]*\\)", " ")       // "(Nabisco)", "(includes foods for usda...)"
                .replaceAll("[^a-z,\\s'-]", " ")      // digits, %, /, etc.
                .replace("'s", "");
        List<String> words = new ArrayList<>();
        int segmentsUsed = 0;
        for (String segment : s.split(",")) {
            List<String> kept = new ArrayList<>();
            for (String w : segment.trim().split("[\\s-]+")) {
                String t = w.replaceAll("^'+|'+$", "");
                if (t.length() < 2 || STOP.contains(t)) continue;
                kept.add(t);
            }
            if (kept.isEmpty()) continue;
            for (String w : kept) {
                if (words.size() < 3) words.add(w);
            }
            if (++segmentsUsed >= 2 || words.size() >= 3) break;
        }
        if (words.isEmpty()) return null;
        String t = String.join(" ", words);
        return t.length() > 40 ? t.substring(0, 40).trim() : t;
    }

    private static String clip(String s, int max) {
        String t = s.trim();
        return t.length() > max ? t.substring(0, max) : t;
    }

    private static int intEnv(String name, int fallback) {
        try {
            String v = System.getenv(name);
            return v == null ? fallback : Math.max(1, Integer.parseInt(v.trim()));
        } catch (NumberFormatException e) {
            return fallback;
        }
    }

    private static String trimOrNull(String v) {
        if (v == null) return null;
        String t = v.trim();
        return t.isEmpty() ? null : t;
    }
}

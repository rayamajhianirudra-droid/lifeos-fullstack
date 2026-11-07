package lifeos_backend.controller;

import lifeos_backend.repository.UserRepository;
import lifeos_backend.service.JwtService;
import lifeos_backend.service.RateLimiter;
import lifeos_backend.service.FoodImageService;
import lifeos_backend.service.OpenFoodFactsService;
import lifeos_backend.service.UsageCounters;
import lifeos_backend.service.UsdaFoodService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.Duration;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/foods")
public class FoodSearchController {

    private static final int MAX_SEARCHES_PER_MINUTE = 30;

    private final UsdaFoodService usda;
    private final JwtService jwtService;
    private final UserRepository userRepository;
    private final RateLimiter rateLimiter;
    private final UsageCounters counters;
    private final FoodImageService images;
    private final OpenFoodFactsService world;

    private static final int MAX_PHOTO_REQUESTS_PER_MINUTE = 40;
    private static final int MAX_PHOTO_ITEMS = 30;

    public FoodSearchController(UsdaFoodService usda, JwtService jwtService,
                                UserRepository userRepository, RateLimiter rateLimiter,
                                UsageCounters counters, FoodImageService images, OpenFoodFactsService world) {
        this.usda = usda;
        this.jwtService = jwtService;
        this.userRepository = userRepository;
        this.rateLimiter = rateLimiter;
        this.counters = counters;
        this.images = images;
        this.world = world;
    }

    private Long userId(String auth) {
        String email = jwtService.extractEmail(auth.replace("Bearer ", ""));
        return userRepository.findByEmail(email).orElseThrow().getId();
    }

    private ResponseEntity<?> tooMany() {
        return ResponseEntity.status(HttpStatus.TOO_MANY_REQUESTS)
                .body(Map.of("error", "Too many searches. Please wait a minute."));
    }

    /**
     * GET /api/foods/world?q=  Packaged foods from around the world (Open Food Facts).
     * The app calls this only when USDA found nothing or the user asks for it.
     */
    @GetMapping("/world")
    public ResponseEntity<?> worldSearch(@RequestHeader("Authorization") String auth, @RequestParam("q") String q) {
        Long id = userId(auth);
        if (q == null || q.isBlank()) return ResponseEntity.ok(List.of());
        if (q.length() > 80) return ResponseEntity.badRequest().body(Map.of("error", "Search is too long."));
        if (!rateLimiter.tryAcquire("foods:user:" + id, MAX_SEARCHES_PER_MINUTE, Duration.ofMinutes(1))) return tooMany();
        List<Map<String, Object>> foods = world.search(q);
        if (foods == OpenFoodFactsService.BUSY) {
            return ResponseEntity.status(HttpStatus.TOO_MANY_REQUESTS)
                    .body(Map.of("error", "Worldwide search is busy right now. Please try again in a minute."));
        }
        if (foods == null) {
            return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE)
                    .body(Map.of("error", "Worldwide food search is temporarily unavailable."));
        }
        return ResponseEntity.ok(foods);
    }

    /** GET /api/foods/barcode/{code}  One packaged food by its barcode (8-14 digits). */
    @GetMapping("/barcode/{code}")
    public ResponseEntity<?> barcode(@RequestHeader("Authorization") String auth, @PathVariable("code") String code) {
        Long id = userId(auth);
        if (OpenFoodFactsService.normalizeBarcode(code) == null) {
            return ResponseEntity.badRequest().body(Map.of("error", "A barcode is 8 to 14 digits."));
        }
        if (!rateLimiter.tryAcquire("foods:user:" + id, MAX_SEARCHES_PER_MINUTE, Duration.ofMinutes(1))) return tooMany();
        var result = world.product(code);
        if (result == null) {
            return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE)
                    .body(Map.of("error", "Barcode lookup is busy right now. Please try again in a minute."));
        }
        return result.<ResponseEntity<?>>map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.status(HttpStatus.NOT_FOUND)
                        .body(Map.of("error", "No food with that barcode yet. You can add it as your own food.")));
    }

    /** GET /api/foods/search?q=big mac  ->  normalized foods with per-100 g nutrients and real portions. */
    @GetMapping("/search")
    public ResponseEntity<?> search(@RequestHeader("Authorization") String auth, @RequestParam("q") String q) {
        String email = jwtService.extractEmail(auth.replace("Bearer ", ""));
        Long userId = userRepository.findByEmail(email).orElseThrow().getId();
        if (q == null || q.isBlank()) return ResponseEntity.ok(List.of());
        if (!rateLimiter.tryAcquire("foods:user:" + userId, MAX_SEARCHES_PER_MINUTE, Duration.ofMinutes(1))) {
            return ResponseEntity.status(HttpStatus.TOO_MANY_REQUESTS)
                    .body(Map.of("error", "Too many searches. Please wait a minute."));
        }
        List<Map<String, Object>> foods = usda.search(q);
        counters.foodSearch(foods != null);
        if (foods == null) {
            return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE)
                    .body(Map.of("error", "Food search is temporarily unavailable."));
        }
        return ResponseEntity.ok(foods);
    }

    /** Body of POST /api/foods/images. */
    public record PhotoRequest(List<PhotoItem> items) {}
    public record PhotoItem(String id, String name, String upc) {}

    /**
     * POST /api/foods/images {"items":[{"id":"a","name":"Bananas, raw","upc":null}]}
     *  -> {"a": {"url": "...", "credit": "...", "creditUrl": "...", "source": "pexels"}}
     * Foods without a photo are left out. Photos are looked up by food name or
     * barcode only, so nothing about the user leaves the server.
     */
    @PostMapping("/images")
    public ResponseEntity<?> photos(@RequestHeader("Authorization") String auth, @RequestBody(required = false) PhotoRequest body) {
        String email = jwtService.extractEmail(auth.replace("Bearer ", ""));
        Long userId = userRepository.findByEmail(email).orElseThrow().getId();
        if (body == null || body.items() == null || body.items().isEmpty()) return ResponseEntity.ok(Map.of());
        if (body.items().size() > MAX_PHOTO_ITEMS) {
            return ResponseEntity.badRequest().body(Map.of("error", "Too many foods in one request."));
        }
        if (!rateLimiter.tryAcquire("photos:user:" + userId, MAX_PHOTO_REQUESTS_PER_MINUTE, Duration.ofMinutes(1))) {
            return ResponseEntity.status(HttpStatus.TOO_MANY_REQUESTS)
                    .body(Map.of("error", "Too many photo requests. Please wait a minute."));
        }
        List<FoodImageService.Item> items = new ArrayList<>();
        for (PhotoItem p : body.items()) {
            if (p == null || p.id() == null || p.name() == null) continue;
            if (p.id().length() > 200 || p.name().length() > 200) continue;
            String upc = p.upc() != null && p.upc().length() <= 14 ? p.upc() : null;
            items.add(new FoodImageService.Item(p.id(), p.name(), upc));
        }
        return ResponseEntity.ok(images.photosFor(items));
    }
}

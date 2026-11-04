package lifeos_backend.controller;

import lifeos_backend.repository.UserRepository;
import lifeos_backend.service.JwtService;
import lifeos_backend.service.RateLimiter;
import lifeos_backend.service.FoodImageService;
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

    private static final int MAX_PHOTO_REQUESTS_PER_MINUTE = 40;
    private static final int MAX_PHOTO_ITEMS = 30;

    public FoodSearchController(UsdaFoodService usda, JwtService jwtService,
                                UserRepository userRepository, RateLimiter rateLimiter,
                                UsageCounters counters, FoodImageService images) {
        this.usda = usda;
        this.jwtService = jwtService;
        this.userRepository = userRepository;
        this.rateLimiter = rateLimiter;
        this.counters = counters;
        this.images = images;
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

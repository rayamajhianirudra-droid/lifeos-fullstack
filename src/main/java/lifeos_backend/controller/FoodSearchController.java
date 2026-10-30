package lifeos_backend.controller;

import lifeos_backend.repository.UserRepository;
import lifeos_backend.service.JwtService;
import lifeos_backend.service.RateLimiter;
import lifeos_backend.service.UsdaFoodService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.Duration;
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

    public FoodSearchController(UsdaFoodService usda, JwtService jwtService,
                                UserRepository userRepository, RateLimiter rateLimiter) {
        this.usda = usda;
        this.jwtService = jwtService;
        this.userRepository = userRepository;
        this.rateLimiter = rateLimiter;
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
        if (foods == null) {
            return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE)
                    .body(Map.of("error", "Food search is temporarily unavailable."));
        }
        return ResponseEntity.ok(foods);
    }
}

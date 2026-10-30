package lifeos_backend.controller;

import lifeos_backend.service.LogDates;
import lifeos_backend.model.FoodLog;
import lifeos_backend.model.User;
import lifeos_backend.repository.UserRepository;
import lifeos_backend.service.FoodLogService;
import lifeos_backend.service.JwtService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/foodlogs")
public class FoodLogController {

    private final FoodLogService foodLogService;
    private final JwtService jwtService;
    private final UserRepository userRepository;

    public FoodLogController(FoodLogService foodLogService,
                             JwtService jwtService,
                             UserRepository userRepository) {
        this.foodLogService = foodLogService;
        this.jwtService = jwtService;
        this.userRepository = userRepository;
    }

    private Long getUserIdFromToken(String authHeader) {
        String token = authHeader.substring(7);
        String email = jwtService.extractEmail(token);
        return userRepository.findByEmail(email)
                .map(User::getId)
                .orElseThrow(() -> new RuntimeException("User not found"));
    }

    @PostMapping
    public ResponseEntity<FoodLog> addFoodLog(
            @RequestHeader("Authorization") String authHeader,
            @RequestBody FoodLog foodLog) {
        Long userId = getUserIdFromToken(authHeader);
        String problem = validate(foodLog);
        if (problem != null) return ResponseEntity.badRequest().build();
        foodLog.setUserId(userId);
        foodLog.setId(null); // never let a client overwrite an existing row
        foodLog.setInsight(null);
        foodLog.setFoodName(foodLog.getFoodName().trim());
        foodLog.setDate(LogDates.resolve(foodLog.getDate()));
        return ResponseEntity.ok(foodLogService.addFoodLog(foodLog));
    }

    @GetMapping
    public ResponseEntity<List<FoodLog>> getFoodLogs(
            @RequestHeader("Authorization") String authHeader,
            @RequestParam(required = false) String date) {
        Long userId = getUserIdFromToken(authHeader);
        if (date != null) {
            LocalDate localDate = parseDate(date);
            if (localDate == null) return ResponseEntity.badRequest().build();
            return ResponseEntity.ok(foodLogService.getFoodLogsByUserAndDate(userId, localDate));
        }
        return ResponseEntity.ok(foodLogService.getFoodLogsByUser(userId));
    }

    @GetMapping("/streak")
    public ResponseEntity<Map<String, Integer>> getStreak(
            @RequestHeader("Authorization") String authHeader,
            @RequestParam(required = false) String date) {
        Long userId = getUserIdFromToken(authHeader);
        int streak = foodLogService.getStreakForUser(userId, LogDates.resolve(date));
        return ResponseEntity.ok(Map.of("streak", streak));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteFoodLog(
            @RequestHeader("Authorization") String authHeader,
            @PathVariable Long id) {
        Long userId = getUserIdFromToken(authHeader);
        return foodLogService.deleteFoodLogForUser(id, userId)
                ? ResponseEntity.ok().build()
                : ResponseEntity.notFound().build();
    }

    /** GET /api/foodlogs/history?days=30&end=2026-10-27 : daily totals, oldest first (charts, sparklines). */
    @GetMapping("/history")
    public ResponseEntity<List<Map<String, Object>>> history(
            @RequestHeader("Authorization") String authHeader,
            @RequestParam(defaultValue = "30") int days,
            @RequestParam(required = false) String end) {
        Long userId = getUserIdFromToken(authHeader);
        int d = Math.max(1, Math.min(days, 365));
        return ResponseEntity.ok(foodLogService.history(userId, LogDates.resolve(end), d));
    }

    /** GET /api/foodlogs/weekly?end=2026-10-27 : the last 7 days. */
    @GetMapping("/weekly")
    public ResponseEntity<List<Map<String, Object>>> weekly(
            @RequestHeader("Authorization") String authHeader,
            @RequestParam(required = false) String end) {
        Long userId = getUserIdFromToken(authHeader);
        return ResponseEntity.ok(foodLogService.history(userId, LogDates.resolve(end), 7));
    }

    private static final java.util.Set<String> MEALS = java.util.Set.of("breakfast", "lunch", "dinner", "snack");

    /** Rejects impossible values so one bad request can't corrupt totals, charts or the AI coach. */
    static String validate(FoodLog f) {
        if (f.getFoodName() == null || f.getFoodName().isBlank() || f.getFoodName().length() > 150) return "name";
        if (!finiteIn(f.getCalories(), 0, 10000)) return "calories";
        if (!finiteIn(f.getProtein(), 0, 1000) || !finiteIn(f.getCarbs(), 0, 1000) || !finiteIn(f.getFat(), 0, 1000)) return "macros";
        if (f.getMealType() == null || !MEALS.contains(f.getMealType())) return "mealType";
        if (f.getQuantity() != null && !finiteIn(f.getQuantity(), 0.01, 100)) return "quantity";
        if (f.getGrams() != null && !finiteIn(f.getGrams(), 0, 10000)) return "grams";
        if (f.getServingLabel() != null && f.getServingLabel().length() > 120) return "servingLabel";
        return null;
    }

    private static boolean finiteIn(double v, double min, double max) {
        return Double.isFinite(v) && v >= min && v <= max;
    }

    private static LocalDate parseDate(String s) {
        try { return LocalDate.parse(s); } catch (Exception e) { return null; }
    }
}

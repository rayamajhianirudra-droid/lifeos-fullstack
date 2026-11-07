package lifeos_backend.controller;

import lifeos_backend.model.User;
import lifeos_backend.service.AdminAccess;
import lifeos_backend.service.CurrentUser;
import lifeos_backend.service.LogDates;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.*;
import java.util.function.Supplier;

/**
 * GET /api/dashboard?date=YYYY-MM-DD&today=YYYY-MM-DD
 *
 * Everything the app shows when it opens, in ONE request instead of 12. On Render's
 * 0.1 CPU each request costs a queue slot, and users far from Ohio pay the distance on
 * every call, so this roughly halves load time for them.
 *
 * Each part comes from the existing endpoint's own handler, called directly with the
 * caller's token, so the data, its order and the access checks are exactly what those
 * endpoints return. A part that fails is left out and named in "failed"; the rest still
 * loads, and the app falls back to fetching that part on its own.
 */
@RestController
@RequestMapping("/api/dashboard")
public class DashboardController {

    private static final Logger log = LoggerFactory.getLogger(DashboardController.class);
    static final int HISTORY_DAYS = 90;

    private final CurrentUser currentUser;
    private final ProfileController profile;
    private final FoodLogController foodLogs;
    private final ExerciseController exercise;
    private final WaterController water;
    private final WeightController weight;
    private final BodyFatController bodyFat;
    private final SleepController sleep;
    private final MoodController mood;
    private final SupplementController supplements;
    private final CustomFoodController customFoods;
    private final AdminAccess adminAccess;

    public DashboardController(CurrentUser currentUser, ProfileController profile, FoodLogController foodLogs,
                               ExerciseController exercise, WaterController water, WeightController weight,
                               BodyFatController bodyFat, SleepController sleep, MoodController mood,
                               SupplementController supplements, CustomFoodController customFoods,
                               AdminAccess adminAccess) {
        this.currentUser = currentUser;
        this.profile = profile;
        this.foodLogs = foodLogs;
        this.exercise = exercise;
        this.water = water;
        this.weight = weight;
        this.bodyFat = bodyFat;
        this.sleep = sleep;
        this.mood = mood;
        this.supplements = supplements;
        this.customFoods = customFoods;
        this.adminAccess = adminAccess;
    }

    @GetMapping
    public ResponseEntity<Map<String, Object>> get(@RequestHeader("Authorization") String auth,
                                                   @RequestParam(required = false) String date,
                                                   @RequestParam(required = false) String today) {
        User me = currentUser.from(auth);   // 401/404 up front, before doing any work
        String day = LogDates.resolve(date).toString();      // the day being viewed
        String now = LogDates.resolve(today).toString();     // the user's own "today"

        Map<String, Object> out = new LinkedHashMap<>();
        List<String> failed = new ArrayList<>();
        part(out, failed, "profile", () -> profile.get(auth));
        part(out, failed, "foodLogs", () -> foodLogs.getFoodLogs(auth, day).getBody());
        part(out, failed, "streak", () -> {
            Map<String, Integer> s = foodLogs.getStreak(auth, now).getBody();
            return s == null ? 0 : s.getOrDefault("streak", 0);
        });
        part(out, failed, "history", () -> foodLogs.history(auth, HISTORY_DAYS, now).getBody());
        part(out, failed, "exerciseLogs", () -> exercise.getExercisesByDate(auth, day).getBody());
        part(out, failed, "waterLogs", () -> water.getAll(auth, day).getBody());
        part(out, failed, "weightLogs", () -> weight.getAll(auth).getBody());
        part(out, failed, "bodyFatLogs", () -> bodyFat.list(auth));
        part(out, failed, "sleepLogs", () -> sleep.getAll(auth, null).getBody());
        part(out, failed, "moodLogs", () -> mood.getAll(auth).getBody());
        part(out, failed, "supplementLogs", () -> supplements.getAll(auth).getBody());
        part(out, failed, "customFoods", () -> customFoods.getAll(auth).getBody());
        // Only present for admins, so other users learn nothing about the admin page
        // (its own endpoint answers 404 to them) and the app skips that request.
        if (adminAccess.isAdmin(me.getEmail())) out.put("admin", true);
        out.put("date", day);
        out.put("failed", failed);
        return ResponseEntity.ok(out);
    }

    private static void part(Map<String, Object> out, List<String> failed, String name, Supplier<Object> load) {
        try {
            out.put(name, load.get());
        } catch (Exception e) {
            failed.add(name);
            log.warn("DASHBOARD PART FAILED: {} ({})", name, e.getClass().getSimpleName());
        }
    }
}

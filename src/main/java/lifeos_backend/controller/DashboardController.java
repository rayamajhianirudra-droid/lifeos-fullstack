package lifeos_backend.controller;

import lifeos_backend.service.AdminAccess;
import lifeos_backend.service.JwtService;
import lifeos_backend.service.LogDates;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.*;
import java.util.concurrent.*;
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
    /**
     * Parts run side by side so their database round trips overlap (one after another
     * they took ~6 s on Render + Neon). Small pool: the database pool has 5 connections
     * and the server 0.1 CPU, so more threads would only queue.
     */
    private static final ExecutorService PARTS = Executors.newFixedThreadPool(4, r -> {
        Thread t = new Thread(r, "dashboard-part");
        t.setDaemon(true);
        return t;
    });
    private static final long PART_TIMEOUT_MS = 20_000;

    private final JwtService jwtService;
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

    public DashboardController(JwtService jwtService, ProfileController profile, FoodLogController foodLogs,
                               ExerciseController exercise, WaterController water, WeightController weight,
                               BodyFatController bodyFat, SleepController sleep, MoodController mood,
                               SupplementController supplements, CustomFoodController customFoods,
                               AdminAccess adminAccess) {
        this.jwtService = jwtService;
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
        // No database work on this thread. With open-session-in-view, a query here would
        // hold one of the 5 pooled connections while waiting for the parts, which need
        // connections too: under load every request did that and they deadlocked.
        // JwtFilter has already checked the token and that the account exists.
        String email = jwtService.extractEmail(auth.replace("Bearer ", ""));
        String day = LogDates.resolve(date).toString();      // the day being viewed
        String now = LogDates.resolve(today).toString();     // the user's own "today"

        long started = System.nanoTime();
        Map<String, Supplier<Object>> parts = new LinkedHashMap<>();
        parts.put("profile", () -> profile.get(auth));
        parts.put("foodLogs", () -> foodLogs.getFoodLogs(auth, day).getBody());
        parts.put("streak", () -> {
            Map<String, Integer> st = foodLogs.getStreak(auth, now).getBody();
            return st == null ? 0 : st.getOrDefault("streak", 0);
        });
        parts.put("history", () -> foodLogs.history(auth, HISTORY_DAYS, now).getBody());
        parts.put("exerciseLogs", () -> exercise.getExercisesByDate(auth, day).getBody());
        parts.put("waterLogs", () -> water.getAll(auth, day).getBody());
        parts.put("weightLogs", () -> weight.getAll(auth).getBody());
        parts.put("bodyFatLogs", () -> bodyFat.list(auth));
        parts.put("sleepLogs", () -> sleep.getAll(auth, null).getBody());
        parts.put("moodLogs", () -> mood.getAll(auth).getBody());
        parts.put("supplementLogs", () -> supplements.getAll(auth).getBody());
        parts.put("customFoods", () -> customFoods.getAll(auth).getBody());

        Map<String, Future<Object[]>> running = new LinkedHashMap<>();
        for (Map.Entry<String, Supplier<Object>> e : parts.entrySet()) {
            running.put(e.getKey(), PARTS.submit(() -> {
                long t0 = System.nanoTime();
                Object value = e.getValue().get();
                return new Object[]{value, (System.nanoTime() - t0) / 1_000_000};
            }));
        }

        Map<String, Object> out = new LinkedHashMap<>();
        List<String> failed = new ArrayList<>();
        Map<String, Long> timings = new LinkedHashMap<>();
        long deadline = System.nanoTime() + TimeUnit.MILLISECONDS.toNanos(PART_TIMEOUT_MS);
        for (Map.Entry<String, Future<Object[]>> e : running.entrySet()) {
            try {
                Object[] r = e.getValue().get(Math.max(1, deadline - System.nanoTime()), TimeUnit.NANOSECONDS);
                out.put(e.getKey(), r[0]);
                timings.put(e.getKey(), (Long) r[1]);
            } catch (Exception ex) {
                e.getValue().cancel(true);
                failed.add(e.getKey());
                Throwable cause = ex instanceof ExecutionException && ex.getCause() != null ? ex.getCause() : ex;
                log.warn("DASHBOARD PART FAILED: {} ({})", e.getKey(), cause.getClass().getSimpleName());
            }
        }
        timings.put("total", (System.nanoTime() - started) / 1_000_000);
        // Only present for admins, so other users learn nothing about the admin page
        // (its own endpoint answers 404 to them) and the app skips that request.
        if (adminAccess.isAdmin(email)) out.put("admin", true);
        out.put("date", day);
        out.put("failed", failed);
        // Milliseconds per part, so slow parts can be spotted on the live server.
        out.put("timingsMs", timings);
        return ResponseEntity.ok(out);
    }

}

package lifeos_backend.service;

import lifeos_backend.model.ExerciseLog;
import lifeos_backend.model.FoodLog;
import lifeos_backend.model.MoodLog;
import lifeos_backend.model.SleepLog;
import lifeos_backend.model.WeightLog;
import lifeos_backend.repository.ExerciseRepository;
import lifeos_backend.repository.FoodLogRepository;
import lifeos_backend.repository.MoodRepository;
import lifeos_backend.repository.SleepRepository;
import lifeos_backend.repository.WeightRepository;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;

/**
 * Builds the AI Coach's view of the user from data stored on the server.
 *
 * Privacy: only numbers, dates, categories and food/exercise names are included.
 * Never the user's name, email, id, or free-text notes. The free Gemini tier may be
 * reviewed by humans, so we send the minimum needed to coach well.
 *
 * Profile settings (age, goals) still live in the browser today, so they arrive from
 * the client and are range-checked here; logged data comes only from the database.
 */
@Service
public class CoachContextService {

    private static final int MAX_FOOD_ITEMS = 15;
    private static final int MAX_EXERCISES = 10;

    private final FoodLogRepository foodRepo;
    private final ExerciseRepository exerciseRepo;
    private final SleepRepository sleepRepo;
    private final MoodRepository moodRepo;
    private final WeightRepository weightRepo;
    private final FoodLogService foodLogService;

    public CoachContextService(FoodLogRepository foodRepo, ExerciseRepository exerciseRepo,
                               SleepRepository sleepRepo, MoodRepository moodRepo,
                               WeightRepository weightRepo, FoodLogService foodLogService) {
        this.foodRepo = foodRepo;
        this.exerciseRepo = exerciseRepo;
        this.sleepRepo = sleepRepo;
        this.moodRepo = moodRepo;
        this.weightRepo = weightRepo;
        this.foodLogService = foodLogService;
    }

    public String build(Long userId, LocalDate day, Map<String, Object> profile) {
        LocalDate start = day.minusDays(6);
        List<FoodLog> foods = foodRepo.findByUserIdAndDateBetweenOrderByDateAsc(userId, start, day);
        List<ExerciseLog> workouts = exerciseRepo.findByUserIdAndDateBetweenOrderByDateAsc(userId, start, day);
        List<SleepLog> sleeps = sleepRepo.findByUserIdAndDateBetweenOrderByDateAsc(userId, start, day);
        List<MoodLog> moods = moodRepo.findByUserIdAndDateBetweenOrderByDateAsc(userId, start, day);

        StringBuilder sb = new StringBuilder();

        // --- Profile & goals (client-provided settings, range-checked) ---
        Map<String, Object> p = profile == null ? Map.of() : profile;
        sb.append("PROFILE: ");
        appendIf(sb, "age", intIn(p, "age", 13, 100), "");
        appendIf(sb, "sex", oneOf(p, "sex", Set.of("male", "female")), "");
        appendIf(sb, "weight", numIn(p, "weightLbs", 60, 700), " lbs");
        Integer ft = intIn(p, "heightFeet", 3, 8), in = intIn(p, "heightInches", 0, 11);
        if (ft != null) sb.append("height ").append(ft).append("'").append(in == null ? 0 : in).append("\", ");
        appendIf(sb, "goal", oneOf(p, "goal", Set.of("lose", "maintain", "gain")), "");
        appendIf(sb, "activity", oneOf(p, "activity", Set.of("sedentary", "light", "moderate", "active", "veryactive")), "");
        Integer calGoal = intIn(p, "dailyGoal", 800, 8000);
        Integer proteinGoal = intIn(p, "proteinGoal", 20, 400);
        appendIf(sb, "daily calorie goal", calGoal, " kcal");
        appendIf(sb, "protein goal", proteinGoal, " g");
        sb.append('\n');

        // --- Today ---
        List<FoodLog> todayFoods = foods.stream().filter(f -> day.equals(f.getDate())).toList();
        double[] t = totals(todayFoods);
        int burnedToday = workouts.stream().filter(w -> day.equals(w.getDate())).mapToInt(ExerciseLog::getCaloriesBurned).sum();
        sb.append("TODAY (").append(day).append("): eaten ").append(r(t[0])).append(" kcal, ")
          .append(r(t[1])).append("g protein, ").append(r(t[2])).append("g carbs, ").append(r(t[3])).append("g fat; ")
          .append("burned ").append(burnedToday).append(" kcal");
        Integer water = intIn(p, "waterGlasses", 0, 30);
        if (water != null) sb.append("; water ").append(water).append("/8 glasses");
        sb.append('\n');
        if (todayFoods.isEmpty()) {
            sb.append("Meals today: none logged yet\n");
        } else {
            sb.append("Meals today:\n");
            todayFoods.stream().limit(MAX_FOOD_ITEMS).forEach(f -> sb.append("- ")
                    .append(clean(f.getMealType(), 12)).append(": ").append(clean(f.getFoodName(), 60))
                    .append(" (").append(r(f.getCalories())).append(" kcal, ").append(r(f.getProtein())).append("P/")
                    .append(r(f.getCarbs())).append("C/").append(r(f.getFat())).append("F)\n"));
            if (todayFoods.size() > MAX_FOOD_ITEMS) sb.append("- (+").append(todayFoods.size() - MAX_FOOD_ITEMS).append(" more)\n");
        }

        // --- Last 7 days, one line per day ---
        sb.append("LAST 7 DAYS (date: kcal eaten, protein g, kcal burned, sleep h, mood /10):\n");
        int daysLogged = 0, proteinHit = 0;
        double sumCal = 0, sumProtein = 0;
        for (LocalDate d = start; !d.isAfter(day); d = d.plusDays(1)) {
            final LocalDate dd = d;
            double[] dt = totals(foods.stream().filter(f -> dd.equals(f.getDate())).toList());
            int burned = workouts.stream().filter(w -> dd.equals(w.getDate())).mapToInt(ExerciseLog::getCaloriesBurned).sum();
            Double sleepH = sleeps.stream().filter(s -> dd.equals(s.getDate())).map(SleepLog::getHoursSlept).findFirst().orElse(null);
            Integer mood = moods.stream().filter(m -> dd.equals(m.getDate())).map(MoodLog::getMoodScore).findFirst().orElse(null);
            sb.append("- ").append(d).append(": ")
              .append(dt[0] > 0 ? r(dt[0]) : "-").append(", ")
              .append(dt[0] > 0 ? r(dt[1]) : "-").append(", ")
              .append(burned).append(", ")
              .append(sleepH == null ? "-" : String.valueOf(sleepH)).append(", ")
              .append(mood == null ? "-" : String.valueOf(mood)).append('\n');
            if (dt[0] > 0) {
                daysLogged++;
                sumCal += dt[0];
                sumProtein += dt[1];
                if (proteinGoal != null && dt[1] >= proteinGoal) proteinHit++;
            }
        }
        if (daysLogged > 0) {
            sb.append("7-day averages on logged days: ").append(r(sumCal / daysLogged)).append(" kcal, ")
              .append(r(sumProtein / daysLogged)).append("g protein; food logged on ").append(daysLogged).append("/7 days");
            if (proteinGoal != null) sb.append("; protein goal hit on ").append(proteinHit).append(" of those days");
            sb.append('\n');
        }

        // --- Workouts this week ---
        if (!workouts.isEmpty()) {
            sb.append("WORKOUTS (last 7 days):\n");
            workouts.stream().skip(Math.max(0, workouts.size() - MAX_EXERCISES)).forEach(w -> sb.append("- ")
                    .append(w.getDate()).append(": ").append(clean(w.getExerciseName(), 40))
                    .append(" (").append(clean(w.getCategory(), 15)).append(", ").append(w.getDurationMinutes())
                    .append(" min, ").append(w.getCaloriesBurned()).append(" kcal)\n"));
        }

        // --- Latest sleep / mood detail ---
        sleeps.stream().reduce((a, b) -> b).ifPresent(s -> sb.append("LATEST SLEEP (").append(s.getDate()).append("): ")
                .append(s.getHoursSlept()).append(" h, quality ").append(clean(s.getQuality(), 12)).append('\n'));
        moods.stream().reduce((a, b) -> b).ifPresent(m -> sb.append("LATEST MOOD (").append(m.getDate()).append("): ")
                .append(m.getMoodScore()).append("/10, energy ").append(clean(m.getEnergyLevel(), 12))
                .append(", stress ").append(clean(m.getStressLevel(), 12)).append('\n'));

        // --- Weight trend ---
        List<WeightLog> weights = weightRepo.findByUserIdOrderByDateDesc(userId);
        if (!weights.isEmpty()) {
            WeightLog latest = weights.get(0);
            sb.append("WEIGHT: latest ").append(latest.getWeightLbs()).append(" lbs (").append(latest.getDate()).append(")");
            weights.stream()
                    .filter(w -> w.getDate() != null && latest.getDate() != null && !w.getDate().isAfter(latest.getDate().minusDays(28)))
                    .findFirst()
                    .ifPresent(old -> sb.append(", change over ~4 weeks: ")
                            .append(String.format(Locale.ROOT, "%+.1f", latest.getWeightLbs() - old.getWeightLbs())).append(" lbs"));
            sb.append('\n');
        }

        sb.append("LOGGING STREAK: ").append(foodLogService.getStreakForUser(userId, day)).append(" days\n");
        return sb.toString();
    }

    // ---------- helpers ----------

    private static double[] totals(List<FoodLog> items) {
        double c = 0, p = 0, cb = 0, f = 0;
        for (FoodLog x : items) { c += x.getCalories(); p += x.getProtein(); cb += x.getCarbs(); f += x.getFat(); }
        return new double[]{c, p, cb, f};
    }

    private static long r(double v) { return Math.round(v); }

    /** One line, no control characters, length-capped: stops a food name from breaking the prompt layout. */
    private static String clean(String s, int max) {
        if (s == null) return "-";
        String one = s.replaceAll("[\\p{Cntrl}]+", " ").trim();
        return one.length() <= max ? one : one.substring(0, max);
    }

    private static Integer intIn(Map<String, Object> p, String key, int min, int max) {
        Double d = numIn(p, key, min, max);
        return d == null ? null : (int) Math.round(d);
    }

    private static Double numIn(Map<String, Object> p, String key, double min, double max) {
        Object v = p.get(key);
        if (v == null) return null;
        try {
            double d = (v instanceof Number n) ? n.doubleValue() : Double.parseDouble(v.toString());
            return (Double.isFinite(d) && d >= min && d <= max) ? d : null;
        } catch (NumberFormatException e) {
            return null;
        }
    }

    private static String oneOf(Map<String, Object> p, String key, Set<String> allowed) {
        Object v = p.get(key);
        if (v == null) return null;
        String s = v.toString().trim().toLowerCase();
        return allowed.contains(s) ? s : null;
    }

    private static void appendIf(StringBuilder sb, String label, Object value, String unit) {
        if (value != null) sb.append(label).append(' ').append(value).append(unit).append(", ");
    }
}

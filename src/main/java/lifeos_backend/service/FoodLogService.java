package lifeos_backend.service;

import lifeos_backend.model.FoodLog;
import lifeos_backend.repository.FoodLogRepository;
import org.springframework.stereotype.Service;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.concurrent.ArrayBlockingQueue;
import java.util.concurrent.ThreadPoolExecutor;
import java.util.concurrent.TimeUnit;

@Service
public class FoodLogService {

    private final FoodLogRepository foodLogRepository;
    private final AiInsightService aiInsightService;

    public FoodLogService(FoodLogRepository foodLogRepository, AiInsightService aiInsightService) {
        this.foodLogRepository = foodLogRepository;
        this.aiInsightService = aiInsightService;
    }

    /**
     * AI food insights run in the background on a small, bounded pool (previously one new
     * thread per log, unbounded). If the queue is full, the insight is skipped; the log
     * itself is never affected.
     */
    private final ThreadPoolExecutor insightPool = new ThreadPoolExecutor(
            2, 2, 60, TimeUnit.SECONDS, new ArrayBlockingQueue<>(100),
            r -> { Thread t = new Thread(r, "food-insight"); t.setDaemon(true); return t; },
            new ThreadPoolExecutor.DiscardPolicy());

    private static final DateTimeFormatter DAY_LABEL = DateTimeFormatter.ofPattern("MMM d", Locale.US);

    public FoodLog addFoodLog(FoodLog foodLog) {
        FoodLog saved = foodLogRepository.save(foodLog);
        insightPool.execute(() -> {
            try {
                String insight = aiInsightService.getFoodInsight(saved.getFoodName());
                if (insight == null || insight.isBlank()) return;   // nothing to add
                foodLogRepository.findById(saved.getId()).ifPresent(row -> {   // row may have been deleted meanwhile
                    row.setInsight(insight);
                    foodLogRepository.save(row);
                });
            } catch (Exception e) {
                System.out.println("FOOD INSIGHT ERROR: " + e.getMessage());
            }
        });
        return saved;
    }

    /**
     * One entry per day from (end - days + 1) to end, oldest first. Days with nothing
     * logged have null totals so charts show a gap instead of a fake zero-calorie day.
     */
    public List<Map<String, Object>> history(Long userId, LocalDate end, int days) {
        LocalDate start = end.minusDays(days - 1L);
        Map<LocalDate, List<FoodLog>> byDay = new HashMap<>();
        for (FoodLog f : foodLogRepository.findByUserIdAndDateBetweenOrderByDateAsc(userId, start, end)) {
            byDay.computeIfAbsent(f.getDate(), k -> new ArrayList<>()).add(f);
        }
        List<Map<String, Object>> out = new ArrayList<>();
        for (LocalDate d = start; !d.isAfter(end); d = d.plusDays(1)) {
            List<FoodLog> items = byDay.getOrDefault(d, List.of());
            Map<String, Object> row = new LinkedHashMap<>();
            row.put("date", d.toString());
            row.put("day", d.format(DAY_LABEL));
            if (items.isEmpty()) {
                row.put("calories", null); row.put("protein", null); row.put("carbs", null); row.put("fat", null);
            } else {
                row.put("calories", Math.round(items.stream().mapToDouble(FoodLog::getCalories).sum()));
                row.put("protein", round1(items.stream().mapToDouble(FoodLog::getProtein).sum()));
                row.put("carbs", round1(items.stream().mapToDouble(FoodLog::getCarbs).sum()));
                row.put("fat", round1(items.stream().mapToDouble(FoodLog::getFat).sum()));
            }
            row.put("items", items.size());
            row.put("meals", items.stream().map(FoodLog::getMealType).filter(Objects::nonNull).distinct().count());
            out.add(row);
        }
        return out;
    }

    private static double round1(double v) { return Math.round(v * 10) / 10.0; }

    public List<FoodLog> getFoodLogsByUser(Long userId) {
        return foodLogRepository.findByUserId(userId);
    }

    public List<FoodLog> getFoodLogsByUserAndDate(Long userId, LocalDate date) {
        return foodLogRepository.findByUserIdAndDate(userId, date);
    }

    public int getStreakForUser(Long userId) {
        return getStreakForUser(userId, LocalDate.now());
    }

    /**
     * Consecutive days with food logged, counted back from the user's local "today".
     * If nothing is logged yet today, the streak is still alive and counts from yesterday
     * (it only breaks once a whole day passes with nothing logged).
     */
    public int getStreakForUser(Long userId, LocalDate today) {
        List<LocalDate> dates = foodLogRepository.findDistinctDatesByUserId(userId);
        if (dates.isEmpty()) return 0;

        int streak = 0;
        LocalDate expected = dates.contains(today) ? today : today.minusDays(1);

        for (LocalDate date : dates) {
            if (date.isAfter(expected)) continue;   // ignore future-dated rows
            if (date.equals(expected)) {
                streak++;
                expected = expected.minusDays(1);
            } else if (date.isBefore(expected)) {
                break;
            }
        }
        return streak;
    }

    public List<FoodLog> getAllFoodLogs() {
        return foodLogRepository.findAll();
    }

    /** Deletes the log only if it belongs to userId. Returns false if not found / not owned. */
    public boolean deleteFoodLogForUser(Long id, Long userId) {
        return foodLogRepository.findById(id)
                .filter(row -> userId.equals(row.getUserId()))
                .map(row -> { foodLogRepository.delete(row); return true; })
                .orElse(false);
    }
}
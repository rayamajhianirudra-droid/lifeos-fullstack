package lifeos_backend.service;

import lifeos_backend.repository.FoodLogRepository;
import lifeos_backend.repository.ExerciseRepository;
import lifeos_backend.repository.WeightRepository;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.util.HashMap;
import java.util.Map;

@Service
public class WeeklyReportService {

    private final FoodLogRepository foodLogRepository;
    private final ExerciseRepository exerciseRepository;
    private final WeightRepository weightRepository;

    public WeeklyReportService(FoodLogRepository foodLogRepository,
                               ExerciseRepository exerciseRepository,
                               WeightRepository weightRepository) {
        this.foodLogRepository = foodLogRepository;
        this.exerciseRepository = exerciseRepository;
        this.weightRepository = weightRepository;
    }

    /**
     * Build a weekly summary for the given user covering the last 7 days.
     */
    public Map<String, Object> getWeeklySummary(Long userId) {
        LocalDate today = LocalDate.now();
        LocalDate weekAgo = today.minusDays(6);

        // Count days with food logs in the past 7 days
        long foodDays = foodLogRepository.findByUserId(userId).stream()
                .map(fl -> fl.getDate())
                .filter(d -> !d.isBefore(weekAgo) && !d.isAfter(today))
                .distinct()
                .count();

        // Count exercise sessions in the past 7 days
        long exerciseSessions = exerciseRepository.findByUserId(userId).stream()
                .filter(el -> !el.getDate().isBefore(weekAgo) && !el.getDate().isAfter(today))
                .count();

        // Total calories logged this week
        double totalCalories = foodLogRepository.findByUserId(userId).stream()
                .filter(fl -> !fl.getDate().isBefore(weekAgo) && !fl.getDate().isAfter(today))
                .mapToDouble(fl -> fl.getCalories())
                .sum();

        Map<String, Object> report = new HashMap<>();
        report.put("weekStart", weekAgo.toString());
        report.put("weekEnd", today.toString());
        report.put("foodDaysLogged", foodDays);
        report.put("exerciseSessions", exerciseSessions);
        report.put("totalCalories", totalCalories);
        report.put("avgDailyCalories", foodDays > 0 ? Math.round(totalCalories / foodDays) : 0);

        return report;
    }
}

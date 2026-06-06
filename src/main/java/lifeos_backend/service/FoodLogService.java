package com.lifeos.lifeos_backend.service;

import com.lifeos.lifeos_backend.model.FoodLog;
import com.lifeos.lifeos_backend.repository.FoodLogRepository;
import org.springframework.stereotype.Service;
import java.time.LocalDate;
import java.util.List;

@Service
public class FoodLogService {

    private final FoodLogRepository foodLogRepository;
    private final AiInsightService aiInsightService;

    public FoodLogService(FoodLogRepository foodLogRepository, AiInsightService aiInsightService) {
        this.foodLogRepository = foodLogRepository;
        this.aiInsightService = aiInsightService;
    }

    public FoodLog addFoodLog(FoodLog foodLog) {
        FoodLog saved = foodLogRepository.save(foodLog);
        new Thread(() -> {
            String insight = aiInsightService.getFoodInsight(saved.getFoodName());
            saved.setInsight(insight);
            foodLogRepository.save(saved);
        }).start();
        return saved;
    }

    public List<FoodLog> getFoodLogsByUser(Long userId) {
        return foodLogRepository.findByUserId(userId);
    }

    public List<FoodLog> getFoodLogsByUserAndDate(Long userId, LocalDate date) {
        return foodLogRepository.findByUserIdAndDate(userId, date);
    }

    public int getStreakForUser(Long userId) {
        List<LocalDate> dates = foodLogRepository.findDistinctDatesByUserId(userId);
        if (dates.isEmpty()) return 0;

        int streak = 0;
        LocalDate expected = LocalDate.now();

        for (LocalDate date : dates) {
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

    public void deleteFoodLog(Long id) {
        foodLogRepository.deleteById(id);
    }
}
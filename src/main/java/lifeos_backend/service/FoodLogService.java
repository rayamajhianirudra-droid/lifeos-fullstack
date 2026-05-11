package com.lifeos.lifeos_backend.service;

import com.lifeos.lifeos_backend.model.FoodLog;
import com.lifeos.lifeos_backend.repository.FoodLogRepository;
import org.springframework.stereotype.Service;
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
        String insight = aiInsightService.getFoodInsight(foodLog.getFoodName());
        foodLog.setInsight(insight);
        return foodLogRepository.save(foodLog);
    }

    public List<FoodLog> getFoodLogsByUser(Long userId) {
        return foodLogRepository.findByUserId(userId);
    }

    public List<FoodLog> getAllFoodLogs() {
        return foodLogRepository.findAll();
    }

    public void deleteFoodLog(Long id) {
        foodLogRepository.deleteById(id);
    }
}
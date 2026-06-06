package com.lifeos.lifeos_backend.controller;

import com.lifeos.lifeos_backend.model.FoodLog;
import com.lifeos.lifeos_backend.model.User;
import com.lifeos.lifeos_backend.repository.UserRepository;
import com.lifeos.lifeos_backend.service.FoodLogService;
import com.lifeos.lifeos_backend.service.JwtService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/foodlogs")
@CrossOrigin(origins = "*")
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
        foodLog.setUserId(userId);
        return ResponseEntity.ok(foodLogService.addFoodLog(foodLog));
    }

    @GetMapping
    public ResponseEntity<List<FoodLog>> getFoodLogs(
            @RequestHeader("Authorization") String authHeader,
            @RequestParam(required = false) String date) {
        Long userId = getUserIdFromToken(authHeader);
        if (date != null) {
            LocalDate localDate = LocalDate.parse(date);
            return ResponseEntity.ok(foodLogService.getFoodLogsByUserAndDate(userId, localDate));
        }
        return ResponseEntity.ok(foodLogService.getFoodLogsByUser(userId));
    }

    @GetMapping("/streak")
    public ResponseEntity<Map<String, Integer>> getStreak(
            @RequestHeader("Authorization") String authHeader) {
        Long userId = getUserIdFromToken(authHeader);
        int streak = foodLogService.getStreakForUser(userId);
        return ResponseEntity.ok(Map.of("streak", streak));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteFoodLog(@PathVariable Long id) {
        foodLogService.deleteFoodLog(id);
        return ResponseEntity.ok().build();
    }
}
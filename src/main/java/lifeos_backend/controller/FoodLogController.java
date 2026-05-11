package com.lifeos.lifeos_backend.controller;

import com.lifeos.lifeos_backend.model.FoodLog;
import com.lifeos.lifeos_backend.service.FoodLogService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/api/foodlogs")
@CrossOrigin(origins = "*")
public class FoodLogController {

    private final FoodLogService foodLogService;

    public FoodLogController(FoodLogService foodLogService) {
        this.foodLogService = foodLogService;
    }

    @PostMapping
    public ResponseEntity<FoodLog> addFoodLog(@RequestBody FoodLog foodLog) {
        return ResponseEntity.ok(foodLogService.addFoodLog(foodLog));
    }

    @GetMapping("/user/{userId}")
    public ResponseEntity<List<FoodLog>> getFoodLogsByUser(@PathVariable Long userId) {
        return ResponseEntity.ok(foodLogService.getFoodLogsByUser(userId));
    }

    @GetMapping
    public ResponseEntity<List<FoodLog>> getAllFoodLogs() {
        return ResponseEntity.ok(foodLogService.getAllFoodLogs());
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteFoodLog(@PathVariable Long id) {
        foodLogService.deleteFoodLog(id);
        return ResponseEntity.ok().build();
    }
}
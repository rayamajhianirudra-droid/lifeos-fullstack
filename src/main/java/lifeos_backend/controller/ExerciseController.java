package com.lifeos.lifeos_backend.controller;

import com.lifeos.lifeos_backend.model.ExerciseLog;
import com.lifeos.lifeos_backend.service.ExerciseService;
import org.springframework.web.bind.annotation.*;
import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/api/exercise")
public class ExerciseController {

    private final ExerciseService exerciseService;

    public ExerciseController(ExerciseService exerciseService) {
        this.exerciseService = exerciseService;
    }

    @PostMapping
    public ExerciseLog logExercise(@RequestBody ExerciseLog log) {
        return exerciseService.logExercise(log);
    }

    @GetMapping("/user/{userId}/date/{date}")
    public List<ExerciseLog> getExercisesByUserAndDate(
            @PathVariable Long userId,
            @PathVariable String date) {
        return exerciseService.getExercisesByUserAndDate(userId, LocalDate.parse(date));
    }

    @DeleteMapping("/{id}")
    public void deleteExercise(@PathVariable Long id) {
        exerciseService.deleteExercise(id);
    }
}
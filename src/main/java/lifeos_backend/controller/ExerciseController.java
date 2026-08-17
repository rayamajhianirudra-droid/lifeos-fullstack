package com.lifeos.lifeos_backend.controller;

import com.lifeos.lifeos_backend.model.ExerciseLog;
import com.lifeos.lifeos_backend.model.User;
import com.lifeos.lifeos_backend.repository.UserRepository;
import com.lifeos.lifeos_backend.service.ExerciseService;
import com.lifeos.lifeos_backend.service.JwtService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/api/exercise")
@CrossOrigin(origins = "*")
public class ExerciseController {

    private final ExerciseService exerciseService;
    private final JwtService jwtService;
    private final UserRepository userRepository;

    public ExerciseController(ExerciseService exerciseService,
                              JwtService jwtService,
                              UserRepository userRepository) {
        this.exerciseService = exerciseService;
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
    public ExerciseLog logExercise(
            @RequestHeader("Authorization") String authHeader,
            @RequestBody ExerciseLog log) {
        Long userId = getUserIdFromToken(authHeader);
        log.setUserId(userId);
        return exerciseService.logExercise(log);
    }

    @GetMapping
    public ResponseEntity<List<ExerciseLog>> getExercisesByDate(
            @RequestHeader("Authorization") String authHeader,
            @RequestParam String date) {
        Long userId = getUserIdFromToken(authHeader);
        return ResponseEntity.ok(
                exerciseService.getExercisesByUserAndDate(userId, LocalDate.parse(date))
        );
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
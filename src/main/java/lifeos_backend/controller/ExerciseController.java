package lifeos_backend.controller;

import lifeos_backend.service.LogDates;
import lifeos_backend.model.ExerciseLog;
import lifeos_backend.model.User;
import lifeos_backend.repository.UserRepository;
import lifeos_backend.service.ExerciseService;
import lifeos_backend.service.JwtService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/api/exercise")
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
        log.setId(null); // never let a client overwrite an existing row
        log.setDate(LogDates.resolve(log.getDate()));
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

    // Removed GET /user/{userId}/date/{date}: it returned ANY user's workouts by id.

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteExercise(
            @RequestHeader("Authorization") String authHeader,
            @PathVariable Long id) {
        Long userId = getUserIdFromToken(authHeader);
        return exerciseService.deleteExerciseForUser(id, userId)
                ? ResponseEntity.ok().build()
                : ResponseEntity.notFound().build();
    }
}
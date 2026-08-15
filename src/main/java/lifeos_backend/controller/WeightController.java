package com.lifeos.lifeos_backend.controller;

import com.lifeos.lifeos_backend.model.WeightEntity;
import com.lifeos.lifeos_backend.model.User;
import com.lifeos.lifeos_backend.repository.UserRepository;
import com.lifeos.lifeos_backend.service.WeightService;
import com.lifeos.lifeos_backend.service.JwtService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/api/weight")
@CrossOrigin(origins = "*")
public class WeightController {

    private final WeightService weightService;
    private final JwtService jwtService;
    private final UserRepository userRepository;

    public WeightController(WeightService weightService,
                            JwtService jwtService,
                            UserRepository userRepository) {
        this.weightService = weightService;
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
    public ResponseEntity<WeightEntity> logWeight(
            @RequestHeader("Authorization") String authHeader,
            @RequestBody WeightEntity entity) {
        Long userId = getUserIdFromToken(authHeader);
        entity.setUserId(userId);
        return ResponseEntity.ok(weightService.logWeight(entity));
    }

    @GetMapping
    public ResponseEntity<List<WeightEntity>> getWeights(
            @RequestHeader("Authorization") String authHeader) {
        Long userId = getUserIdFromToken(authHeader);
        return ResponseEntity.ok(weightService.getWeightsByUser(userId));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteWeight(@PathVariable Long id) {
        weightService.deleteWeight(id);
        return ResponseEntity.ok().build();
    }
}
package com.lifeos.lifeos_backend.controller;

import com.lifeos.lifeos_backend.model.User;
import com.lifeos.lifeos_backend.repository.UserRepository;
import com.lifeos.lifeos_backend.service.AiInsightService;
import com.lifeos.lifeos_backend.service.JwtService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/ai")
@CrossOrigin(origins = "*")
public class AiChatController {

    private final AiInsightService aiInsightService;
    private final JwtService jwtService;
    private final UserRepository userRepository;

    public AiChatController(AiInsightService aiInsightService,
                            JwtService jwtService,
                            UserRepository userRepository) {
        this.aiInsightService = aiInsightService;
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

    public static class ChatRequest {
        public String message;
        public String context;
        public List<Map<String, String>> history;
    }

    public static class ChatResponse {
        public String response;
        public ChatResponse(String response) {
            this.response = response;
        }
    }

    @PostMapping("/chat")
    public ResponseEntity<ChatResponse> chat(
            @RequestHeader("Authorization") String authHeader,
            @RequestBody ChatRequest request) {
        Long userId = getUserIdFromToken(authHeader);

        String reply = aiInsightService.getChatResponse(
                request.message,
                request.context,
                request.history
        );
        return ResponseEntity.ok(new ChatResponse(reply));
    }
}
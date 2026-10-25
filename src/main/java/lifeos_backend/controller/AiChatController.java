package lifeos_backend.controller;

import lifeos_backend.model.User;
import lifeos_backend.repository.UserRepository;
import lifeos_backend.service.AiInsightService;
import lifeos_backend.service.JwtService;
import lifeos_backend.service.RateLimiter;
import java.time.Duration;
import java.util.ArrayList;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/ai")
public class AiChatController {

    private final AiInsightService aiInsightService;
    private final JwtService jwtService;
    private final UserRepository userRepository;
    private final RateLimiter rateLimiter;

    // Protects the Gemini quota/bill: one account can't burn it for everyone.
    private static final int MAX_CHATS_PER_HOUR = 40;
    private static final int MAX_MESSAGE_CHARS = 2000;
    private static final int MAX_CONTEXT_CHARS = 4000;
    private static final int MAX_HISTORY_TURNS = 20;

    public AiChatController(AiInsightService aiInsightService,
                            JwtService jwtService,
                            UserRepository userRepository,
                            RateLimiter rateLimiter) {
        this.aiInsightService = aiInsightService;
        this.jwtService = jwtService;
        this.userRepository = userRepository;
        this.rateLimiter = rateLimiter;
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

        if (request == null || request.message == null || request.message.isBlank()) {
            return ResponseEntity.badRequest().body(new ChatResponse("Please type a message."));
        }
        if (!rateLimiter.tryAcquire("ai:user:" + userId, MAX_CHATS_PER_HOUR, Duration.ofHours(1))) {
            return ResponseEntity.ok(new ChatResponse(
                    "You've reached the AI Coach limit for this hour. Take a breather and try again soon!"));
        }

        String reply = aiInsightService.getChatResponse(
                truncate(request.message, MAX_MESSAGE_CHARS),
                truncate(request.context, MAX_CONTEXT_CHARS),
                cleanHistory(request.history)
        );
        return ResponseEntity.ok(new ChatResponse(reply));
    }

    private static String truncate(String s, int max) {
        if (s == null) return "";
        return s.length() <= max ? s : s.substring(0, max);
    }

    /** Keeps the last MAX_HISTORY_TURNS turns, drops malformed ones, caps each turn's length. */
    private static List<Map<String, String>> cleanHistory(List<Map<String, String>> history) {
        List<Map<String, String>> out = new ArrayList<>();
        if (history == null) return out;
        int start = Math.max(0, history.size() - MAX_HISTORY_TURNS);
        for (Map<String, String> turn : history.subList(start, history.size())) {
            if (turn == null || turn.get("text") == null) continue;
            String role = "ai".equals(turn.get("role")) ? "ai" : "user";
            out.add(Map.of("role", role, "text", truncate(turn.get("text"), MAX_MESSAGE_CHARS)));
        }
        return out;
    }
}

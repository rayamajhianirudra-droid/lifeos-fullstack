package com.lifeos.lifeos_backend.controller;

import com.lifeos.lifeos_backend.service.AiInsightService;
import org.springframework.web.bind.annotation.*;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/ai")
@CrossOrigin(origins = "*")
public class AiChatController {

    private final AiInsightService aiInsightService;

    public AiChatController(AiInsightService aiInsightService) {
        this.aiInsightService = aiInsightService;
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
    public ChatResponse chat(@RequestBody ChatRequest request) {
        String reply = aiInsightService.getChatResponse(
                request.message,
                request.context,
                request.history
        );
        return new ChatResponse(reply);
    }
}
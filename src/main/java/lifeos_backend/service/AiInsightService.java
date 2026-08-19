package com.lifeos.lifeos_backend.service;

import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;
import org.springframework.http.MediaType;
import java.util.List;
import java.util.Map;
import java.util.HashMap;

@Service
public class AiInsightService {
    private final WebClient webClient;
    private final String apiKey = System.getenv("GEMINI_API_KEY") != null
            ? System.getenv("GEMINI_API_KEY")
            : "AIzaSyDNMcWVNPim5v1_miXom6pjacu9a7ps2EQ";
    private final HashMap<String, String> cache = new HashMap<>();

    public AiInsightService() {
        this.webClient = WebClient.builder()
                .baseUrl("https://generativelanguage.googleapis.com")
                .build();
    }

    public String getFoodInsight(String foodName) {
        String key = foodName.toLowerCase().trim();
        if (cache.containsKey(key)) {
            System.out.println("CACHE HIT: " + key);
            return cache.get(key);
        }
        try {
            Map<String, Object> body = Map.of(
                    "contents", List.of(
                            Map.of("parts", List.of(
                                    Map.of("text", "Give me exactly one sentence about the single most interesting health benefit of " + foodName + ". Be specific and concise. No intro, just the fact.")
                            ))
                    )
            );
            Map response = webClient.post()
                    .uri("/v1beta/models/gemini-2.0-flash:generateContent?key=" + apiKey)
                    .contentType(MediaType.APPLICATION_JSON)
                    .bodyValue(body)
                    .retrieve()
                    .bodyToMono(Map.class)
                    .block();
            List<Map> candidates = (List<Map>) response.get("candidates");
            Map content = (Map) candidates.get(0).get("content");
            List<Map> parts = (List<Map>) content.get("parts");
            String insight = (String) parts.get(0).get("text");
            cache.put(key, insight);
            System.out.println("CACHE STORED: " + key);
            return insight;
        } catch (Exception e) {
            System.out.println("AI ERROR: " + e.getMessage());
            return "A nutritious choice for your health!";
        }
    }

    public String getChatResponse(String message, String context, List<Map<String, String>> history) {
        try {
            String systemPrompt = "You are an encouraging, knowledgeable health and fitness coach inside the LifeOS app. "
                    + "Be warm but honest, keep responses concise (2-4 sentences unless the user asks for detail), "
                    + "and give specific, actionable advice grounded in the user's actual data below. "
                    + "Never repeat the user's stats back verbatim unless it's directly relevant to your answer. "
                    + "Speak like a real coach, not a chatbot.\n\nUser's current stats:\n" + context;

            List<Map<String, Object>> contents = new java.util.ArrayList<>();

            contents.add(Map.of(
                    "role", "user",
                    "parts", List.of(Map.of("text", systemPrompt))
            ));
            contents.add(Map.of(
                    "role", "model",
                    "parts", List.of(Map.of("text", "Understood. I'll coach based on their real data, keep it concise, and sound like a real person."))
            ));

            if (history != null) {
                for (Map<String, String> turn : history) {
                    String role = "ai".equals(turn.get("role")) ? "model" : "user";
                    contents.add(Map.of(
                            "role", role,
                            "parts", List.of(Map.of("text", turn.get("text")))
                    ));
                }
            }

            contents.add(Map.of(
                    "role", "user",
                    "parts", List.of(Map.of("text", message))
            ));

            Map<String, Object> body = Map.of("contents", contents);

            Map response = webClient.post()
                    .uri("/v1beta/models/gemini-2.0-flash:generateContent?key=" + apiKey)
                    .contentType(MediaType.APPLICATION_JSON)
                    .bodyValue(body)
                    .retrieve()
                    .bodyToMono(Map.class)
                    .block();

            List<Map> candidates = (List<Map>) response.get("candidates");
            Map contentObj = (Map) candidates.get(0).get("content");
            List<Map> parts = (List<Map>) contentObj.get("parts");
            return (String) parts.get(0).get("text");

        } catch (Exception e) {
            System.out.println("AI CHAT ERROR: " + e.getMessage());
            return "Sorry, I'm having trouble connecting right now — try again in a moment.";
        }
    }
}
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
    private final String apiKey = "AIzaSyDNMcWVNPim5v1_miXom6pjacu9a7ps2EQ";
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
}
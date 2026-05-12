package com.lifeos.lifeos_backend.service;

import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;
import org.springframework.http.MediaType;
import java.util.List;
import java.util.Map;

@Service
public class AiInsightService {

    private final WebClient webClient;
    private final String apiKey = "AIzaSyDNMcWVNPim5v1_miXom6pjacu9a7ps2EQ";

    public AiInsightService() {
        this.webClient = WebClient.builder()
                .baseUrl("https://generativelanguage.googleapis.com")
                .build();
    }

    public String getFoodInsight(String foodName) {
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
            return (String) parts.get(0).get("text");

        } catch (Exception e) {
            System.out.println("AI ERROR: " + e.getMessage());
            return "A nutritious choice for your health!";
        }

    }
}
package com.lifeos.lifeos_backend.service;

import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;
import org.springframework.http.MediaType;
import java.util.List;
import java.util.Map;

@Service
public class AiInsightService {

    private final WebClient webClient;

    public AiInsightService() {
        this.webClient = WebClient.builder()
                .baseUrl("https://api.anthropic.com")
                .defaultHeader("x-api-key", System.getenv("ANTHROPIC_API_KEY"))
                .defaultHeader("anthropic-version", "2023-06-01")
                .defaultHeader("content-type", "application/json")
                .build();
    }

    public String getFoodInsight(String foodName) {
        try {
            Map<String, Object> body = Map.of(
                    "model", "claude-haiku-4-5-20251001",
                    "max_tokens", 100,
                    "messages", List.of(
                            Map.of("role", "user", "content",
                                    "Give me exactly one sentence about the single most interesting health benefit of "
                                            + foodName + ". Be specific and concise. No intro, just the fact.")
                    )
            );

            Map response = webClient.post()
                    .uri("/v1/messages")
                    .contentType(MediaType.APPLICATION_JSON)
                    .bodyValue(body)
                    .retrieve()
                    .bodyToMono(Map.class)
                    .block();

            List<Map> content = (List<Map>) response.get("content");
            return (String) content.get(0).get("text");

        } catch (Exception e) {
            return "A nutritious choice for your health!";
        }
    }
}
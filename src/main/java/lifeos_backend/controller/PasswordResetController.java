package lifeos_backend.controller;

import lifeos_backend.model.User;
import lifeos_backend.repository.UserRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.reactive.function.client.WebClient;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

@RestController
@RequestMapping("/api/auth")
@CrossOrigin(origins = "*")
public class PasswordResetController {

    private final UserRepository userRepository;
    private final BCryptPasswordEncoder encoder = new BCryptPasswordEncoder();
    private final Map<String, String> resetTokens = new HashMap<>();

    @Value("${resend.api.key}")
    private String resendApiKey;

    private final WebClient webClient = WebClient.builder()
            .baseUrl("https://api.resend.com")
            .build();

    public PasswordResetController(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    @PostMapping("/forgot-password")
    public String forgotPassword(@RequestBody Map<String, String> body) {
        String email = body.get("email");
        Optional<User> userOpt = userRepository.findByEmail(email);
        if (userOpt.isEmpty()) {
            return "If this email exists, a reset token has been sent.";
        }

        String token = UUID.randomUUID().toString();
        resetTokens.put(token, email);

        // Send via Resend API
        Map<String, Object> emailPayload = Map.of(
            "from", "LifeOS Health <onboarding@resend.dev>",
            "to", List.of(email),
            "subject", "LifeOS Health — Password Reset",
            "text", "Hi! You requested a password reset.\n\n" +
                    "Your reset token is: " + token + "\n\n" +
                    "Enter this token in the app to reset your password.\n\n" +
                    "If you didn\'t request this, ignore this email.\n\n" +
                    "— LifeOS Health Team"
        );

        try {
            webClient.post()
                    .uri("/emails")
                    .header("Authorization", "Bearer " + resendApiKey)
                    .contentType(MediaType.APPLICATION_JSON)
                    .bodyValue(emailPayload)
                    .retrieve()
                    .bodyToMono(String.class)
                    .block();
        } catch (Exception e) {
            System.err.println("Resend email error: " + e.getMessage());
            return "Failed to send reset email: " + e.getMessage();
        }

        return "If this email exists, a reset token has been sent.";
    }

    @PostMapping("/reset-password")
    public String resetPassword(@RequestBody Map<String, String> body) {
        String token = body.get("token");
        String newPassword = body.get("newPassword");

        String email = resetTokens.get(token);
        if (email == null) {
            return "Invalid or expired token.";
        }

        Optional<User> userOpt = userRepository.findByEmail(email);
        if (userOpt.isEmpty()) {
            return "User not found.";
        }

        User user = userOpt.get();
        user.setPassword(encoder.encode(newPassword));
        userRepository.save(user);
        resetTokens.remove(token);

        return "Password reset successful!";
    }
}

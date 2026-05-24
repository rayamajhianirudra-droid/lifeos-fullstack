package com.lifeos.lifeos_backend.controller;

import com.lifeos.lifeos_backend.model.User;
import com.lifeos.lifeos_backend.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.web.bind.annotation.*;
import java.util.HashMap;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

@RestController
@RequestMapping("/api/auth")
public class PasswordResetController {

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private JavaMailSender mailSender;

    private final BCryptPasswordEncoder encoder = new BCryptPasswordEncoder();
    private final Map<String, String> resetTokens = new HashMap<>();

    @PostMapping("/forgot-password")
    public String forgotPassword(@RequestBody Map<String, String> body) {
        String email = body.get("email");
        Optional<User> userOpt = userRepository.findByEmail(email);
        if (userOpt.isEmpty()) {
            return "If this email exists, a reset link has been sent.";
        }
        String token = UUID.randomUUID().toString();
        resetTokens.put(token, email);

        SimpleMailMessage message = new SimpleMailMessage();
        message.setFrom("lifeoshealth@gmail.com");
        message.setTo(email);
        message.setSubject("LifeOS Health — Password Reset");
        message.setText("Hi! You requested a password reset.\n\n" +
                "Your reset token is: " + token + "\n\n" +
                "Enter this token in the app to reset your password.\n\n" +
                "If you didn't request this, ignore this email.\n\n" +
                "— LifeOS Health Team");
        mailSender.send(message);

        return "If this email exists, a reset link has been sent.";
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
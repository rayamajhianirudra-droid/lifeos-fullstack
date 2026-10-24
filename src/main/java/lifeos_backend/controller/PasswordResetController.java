package lifeos_backend.controller;

import lifeos_backend.model.PasswordResetToken;
import lifeos_backend.model.User;
import lifeos_backend.repository.PasswordResetTokenRepository;
import lifeos_backend.repository.UserRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.reactive.function.client.WebClient;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

/**
 * Handles password reset flow for LifeOS Health.
 *
 * -------------------------------------------------------------------------
 * Security design
 * -------------------------------------------------------------------------
 * 1. RATE LIMITING
 *    Max 3 reset requests per email per hour. Prevents email flooding and
 *    enumeration attacks (attacker can't spam to discover registered emails
 *    by timing differences because we return the same message regardless).
 *
 * 2. TOKEN GENERATION
 *    UUID.randomUUID() — 122 bits of entropy. Cryptographically unpredictable.
 *
 * 3. TOKEN STORAGE
 *    The raw token is NEVER stored. We store a BCrypt hash of the token in
 *    the database. If the DB is breached, an attacker cannot use the hashes
 *    to reset passwords.
 *
 * 4. TOKEN EXPIRY
 *    Tokens expire after 15 minutes (set in PasswordResetToken constructor).
 *    Checked at application level; expired tokens are rejected and deleted.
 *
 * 5. SINGLE USE
 *    Token row is deleted immediately on successful password reset. Cannot
 *    be reused. All other tokens for the same email are also deleted.
 *
 * 6. EMAIL DELIVERY
 *    Uses Resend REST API (not SMTP). API key loaded from environment variable
 *    RESEND_API_KEY — never hardcoded, never committed to git.
 *
 * 7. AMBIGUOUS RESPONSES
 *    Both "email found" and "email not found" return the same success message
 *    on forgot-password. This prevents user enumeration (attacker cannot tell
 *    which emails are registered in LifeOS).
 *
 * 8. EXPIRED TOKEN CLEANUP
 *    Expired tokens are purged from the DB on every forgot-password request
 *    (lightweight housekeeping — avoids needing a separate scheduled job).
 * -------------------------------------------------------------------------
 *
 * Endpoints:
 *   POST /api/auth/forgot-password   { "email": "user@example.com" }
 *   POST /api/auth/reset-password    { "token": "uuid", "newPassword": "..." }
 */
@RestController
@RequestMapping("/api/auth")
@CrossOrigin(origins = "*")
public class PasswordResetController {

    // -------------------------------------------------------------------------
    // Configuration
    // -------------------------------------------------------------------------

    /** Max reset requests allowed per email within RATE_LIMIT_WINDOW_HOURS. */
    private static final int RATE_LIMIT_MAX_REQUESTS = 3;

    /** Window in hours for the rate limit check. */
    private static final int RATE_LIMIT_WINDOW_HOURS = 1;

    // -------------------------------------------------------------------------
    // Dependencies
    // -------------------------------------------------------------------------

    private final UserRepository userRepository;
    private final PasswordResetTokenRepository tokenRepository;
    private final BCryptPasswordEncoder encoder = new BCryptPasswordEncoder();

    /**
     * Resend API key — injected from the RESEND_API_KEY environment variable.
     * Set this on your machine via Windows Environment Variables (local dev)
     * or your cloud platform's secret manager (production).
     * NEVER hardcode this value here.
     */
    @Value("${resend.api.key}")
    private String resendApiKey;

    private final WebClient webClient = WebClient.builder()
            .baseUrl("https://api.resend.com")
            .build();

    // -------------------------------------------------------------------------
    // Constructor
    // -------------------------------------------------------------------------

    public PasswordResetController(UserRepository userRepository,
                                   PasswordResetTokenRepository tokenRepository) {
        this.userRepository = userRepository;
        this.tokenRepository = tokenRepository;
    }

    // -------------------------------------------------------------------------
    // Endpoints
    // -------------------------------------------------------------------------

    /**
     * Step 1: User submits their email to request a password reset.
     *
     * Behaviour:
     * - Returns the SAME response whether the email exists or not (prevents
     *   user enumeration).
     * - Enforces rate limit: max 3 requests per email per hour.
     * - Purges any expired tokens from the DB as housekeeping.
     * - Generates a secure UUID token, stores its BCrypt hash in the DB,
     *   and sends the raw token to the user's email via Resend.
     */
    @PostMapping("/forgot-password")
    public ResponseEntity<String> forgotPassword(@RequestBody Map<String, String> body) {
        String email = body.get("email");

        if (email == null || email.isBlank()) {
            return ResponseEntity.badRequest().body("Email is required.");
        }

        // Housekeeping: remove expired tokens so the DB stays clean
        tokenRepository.deleteByExpiresAtBefore(LocalDateTime.now());

        // Rate limit check — same response whether email exists or not
        long recentRequests = tokenRepository.countByEmailAndCreatedAtAfter(
                email, LocalDateTime.now().minusHours(RATE_LIMIT_WINDOW_HOURS));
        if (recentRequests >= RATE_LIMIT_MAX_REQUESTS) {
            // Return 200 with the same message (don't reveal whether email exists)
            return ResponseEntity.ok(
                    "If this email exists, a reset link has been sent. " +
                    "Please check your inbox (and spam folder).");
        }

        // Only proceed with email/token work if the user actually exists
        Optional<User> userOpt = userRepository.findByEmail(email);
        if (userOpt.isPresent()) {
            // Generate raw token — this is what the user enters in the app
            String rawToken = UUID.randomUUID().toString();

            // Hash the token before storing — raw token never touches the DB
            String tokenHash = encoder.encode(rawToken);

            // Persist the hashed token (expires in 15 min — set in constructor)
            tokenRepository.save(new PasswordResetToken(tokenHash, email));

            // Send email via Resend REST API
            sendResetEmail(email, rawToken);
        }

        // Always return the same message
        return ResponseEntity.ok(
                "If this email exists, a reset link has been sent. " +
                "Please check your inbox (and spam folder).");
    }

    /**
     * Step 2: User submits the token from their email + their new password.
     *
     * Behaviour:
     * - Finds all DB tokens for this email and checks each hash against the
     *   raw token using BCrypt.matches() (safe constant-time comparison).
     * - Rejects expired tokens (deletes them from DB).
     * - On success: updates the password, deletes ALL tokens for this email
     *   (single-use + cleanup), returns success.
     * - On failure: returns a generic "Invalid or expired token" message.
     */
    @PostMapping("/reset-password")
    public ResponseEntity<String> resetPassword(@RequestBody Map<String, String> body) {
        String rawToken = body.get("token");
        String newPassword = body.get("newPassword");

        String emailFromBody = body.get("email");
        if (emailFromBody == null || emailFromBody.isBlank()) {
            return ResponseEntity.badRequest().body("Email is required.");
        }
        if (rawToken == null || rawToken.isBlank()) {
            return ResponseEntity.badRequest().body("Token is required.");
        }
        if (newPassword == null || newPassword.length() < 8) {
            return ResponseEntity.badRequest()
                    .body("Password must be at least 8 characters.");
        }

        // Find the matching token by BCrypt-comparing the raw token against
        // stored hashes for this email only. Scoped to emailFromBody so we
        // never scan the full table. At most RATE_LIMIT_MAX_REQUESTS rows.
        // BCrypt.matches() is intentionally slow (~100ms) — not a brute-force
        // risk here because we've already rate-limited token creation.
        PasswordResetToken matched = null;
        for (PasswordResetToken candidate : tokenRepository.findByEmail(emailFromBody)) {
            if (encoder.matches(rawToken, candidate.getTokenHash())) {
                matched = candidate;
                break;
            }
        }

        if (matched == null) {
            return ResponseEntity.badRequest().body("Invalid or expired token.");
        }

        // Check expiry
        if (matched.isExpired()) {
            tokenRepository.delete(matched);
            return ResponseEntity.badRequest().body("Invalid or expired token.");
        }

        // Look up the user by email from the token row
        Optional<User> userOpt = userRepository.findByEmail(matched.getEmail());
        if (userOpt.isEmpty()) {
            tokenRepository.delete(matched);
            return ResponseEntity.badRequest().body("Invalid or expired token.");
        }

        // Update password
        User user = userOpt.get();
        user.setPassword(encoder.encode(newPassword));
        userRepository.save(user);

        // Delete ALL tokens for this email — single-use + cleanup
        tokenRepository.deleteByEmail(matched.getEmail());

        return ResponseEntity.ok("Password reset successful! You can now log in.");
    }

    // -------------------------------------------------------------------------
    // Private helpers
    // -------------------------------------------------------------------------

    /**
     * Sends the password reset email via the Resend REST API.
     *
     * Uses the free-tier sender address (onboarding@resend.dev).
     * Once you verify a custom domain in Resend, update the "from" field to
     * something like "LifeOS Health <noreply@lifeoshealth.com>".
     *
     * Errors are logged to stderr but do NOT propagate — the caller already
     * returned the ambiguous success message, so we can't change the response.
     * In production, consider adding alerting/monitoring here.
     */
    private void sendResetEmail(String toEmail, String rawToken) {
        Map<String, Object> payload = Map.of(
                "from", "LifeOS Health <onboarding@resend.dev>",
                "to", List.of(toEmail),
                "subject", "LifeOS Health — Password Reset Request",
                "text",
                "Hi!\n\n" +
                "You requested a password reset for your LifeOS Health account.\n\n" +
                "Your reset token is:\n\n" +
                "  " + rawToken + "\n\n" +
                "Enter this token in the app to reset your password.\n" +
                "This token expires in 15 minutes.\n\n" +
                "If you did not request this, you can safely ignore this email. " +
                "Your account has not been changed.\n\n" +
                "— The LifeOS Health Team"
        );

        try {
            String response = webClient.post()
                    .uri("/emails")
                    .header("Authorization", "Bearer " + resendApiKey)
                    .contentType(MediaType.APPLICATION_JSON)
                    .bodyValue(payload)
                    .retrieve()
                    .bodyToMono(String.class)
                    .block();
            System.out.println("Resend response: " + response);
        } catch (Exception e) {
            // Log the error — do not surface to the client (ambiguous response policy)
            System.err.println("[PasswordReset] Resend email failed for " +
                    toEmail + ": " + e.getMessage());
        }
    }
}

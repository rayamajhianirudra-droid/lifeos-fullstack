package lifeos_backend.controller;

import lifeos_backend.model.User;
import lifeos_backend.repository.UserRepository;
import lifeos_backend.service.JwtService;
import lifeos_backend.service.RateLimiter;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.HttpStatus;
import java.time.Duration;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final UserRepository userRepository;
    private final JwtService jwtService;
    private final PasswordEncoder passwordEncoder;
    private final RateLimiter rateLimiter;

    // Brute-force limits. Per-email is the main protection; per-IP is generous
    // because several real users can share one IP (campus Wi-Fi, mobile carriers).
    private static final int MAX_FAILS_PER_EMAIL = 10;
    private static final int MAX_FAILS_PER_IP = 100;
    private static final Duration LOGIN_WINDOW = Duration.ofMinutes(15);
    private static final int MAX_REGISTER_PER_IP = 30;
    private static final Duration REGISTER_WINDOW = Duration.ofHours(1);

    // Compared against when the email doesn't exist, so a login for a missing
    // account takes as long as a real one (prevents finding accounts by timing).
    private String dummyHash;

    public AuthController(UserRepository userRepository,
                          JwtService jwtService,
                          PasswordEncoder passwordEncoder,
                          RateLimiter rateLimiter) {
        this.userRepository = userRepository;
        this.jwtService = jwtService;
        this.passwordEncoder = passwordEncoder;
        this.rateLimiter = rateLimiter;
        this.dummyHash = passwordEncoder.encode("timing-equalizer-not-a-real-password");
    }

    @PostMapping("/register")
    public ResponseEntity<?> register(@RequestBody User user, HttpServletRequest request) {
        if (!rateLimiter.tryAcquire("register:ip:" + RateLimiter.clientIp(request), MAX_REGISTER_PER_IP, REGISTER_WINDOW)) {
            return ResponseEntity.status(HttpStatus.TOO_MANY_REQUESTS)
                    .body("Too many sign-up attempts. Please try again later.");
        }
        // Never trust client-supplied ids: saving a User with an existing id would
        // OVERWRITE that account (takeover). Always create a brand-new row.
        user.setId(null);
        if (user.getEmail() == null || user.getEmail().isBlank()
                || user.getPassword() == null || user.getPassword().length() < 8) {
            return ResponseEntity.badRequest().body("Email and a password of at least 8 characters are required.");
        }
        if (userRepository.findByEmail(user.getEmail()).isPresent()) {
            return ResponseEntity.badRequest().body("Email already exists!");
        }
        user.setPassword(passwordEncoder.encode(user.getPassword()));
        userRepository.save(user);
        String token = jwtService.generateToken(user.getEmail());
        return ResponseEntity.ok(Map.of("token", token, "name", user.getName()));
    }

    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody Map<String, String> body, HttpServletRequest request) {
        String email = body.get("email");
        String password = body.get("password");
        if (email == null || password == null) {
            return ResponseEntity.badRequest().body("Invalid email or password!");
        }
        String emailKey = "login:email:" + email.trim().toLowerCase();
        String ipKey = "login:ip:" + RateLimiter.clientIp(request);
        if (rateLimiter.count(emailKey, LOGIN_WINDOW) >= MAX_FAILS_PER_EMAIL
                || rateLimiter.count(ipKey, LOGIN_WINDOW) >= MAX_FAILS_PER_IP) {
            return ResponseEntity.status(HttpStatus.TOO_MANY_REQUESTS)
                    .body("Too many failed attempts. Please wait 15 minutes and try again.");
        }

        Optional<User> userOpt = userRepository.findByEmail(email);
        boolean ok;
        if (userOpt.isPresent()) {
            ok = passwordEncoder.matches(password, userOpt.get().getPassword());
        } else {
            passwordEncoder.matches(password, dummyHash); // same cost as a real check
            ok = false;
        }
        if (!ok) {
            rateLimiter.record(emailKey);
            rateLimiter.record(ipKey);
            return ResponseEntity.badRequest().body("Invalid email or password!");
        }
        rateLimiter.reset(emailKey);
        String token = jwtService.generateToken(email);
        return ResponseEntity.ok(Map.of("token", token, "name", userOpt.get().getName()));
    }
}
package lifeos_backend.controller;

import lifeos_backend.service.AdminAccess;
import lifeos_backend.service.AdminStatsService;
import lifeos_backend.service.JwtService;
import lifeos_backend.service.RateLimiter;
import org.springframework.http.CacheControl;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.Duration;
import java.util.Map;

/**
 * Private admin dashboard data (totals only, see AdminStatsService).
 * Anyone not listed in ADMIN_EMAILS gets 404, exactly like a route that
 * doesn't exist, so the endpoint can't be discovered. Requires a valid JWT
 * like every other non-auth route.
 */
@RestController
@RequestMapping("/api/admin")
public class AdminController {

    private static final int MAX_REQUESTS_PER_MINUTE = 20;

    private final JwtService jwtService;
    private final AdminAccess adminAccess;
    private final AdminStatsService stats;
    private final RateLimiter rateLimiter;

    public AdminController(JwtService jwtService, AdminAccess adminAccess,
                           AdminStatsService stats, RateLimiter rateLimiter) {
        this.jwtService = jwtService;
        this.adminAccess = adminAccess;
        this.stats = stats;
        this.rateLimiter = rateLimiter;
    }

    @GetMapping("/stats")
    public ResponseEntity<?> stats(@RequestHeader("Authorization") String auth) {
        String email = jwtService.extractEmail(auth.replace("Bearer ", ""));
        if (!adminAccess.isAdmin(email)) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).build();
        }
        if (!rateLimiter.tryAcquire("admin:" + email.toLowerCase(), MAX_REQUESTS_PER_MINUTE, Duration.ofMinutes(1))) {
            return ResponseEntity.status(HttpStatus.TOO_MANY_REQUESTS).body(Map.of("error", "Slow down a little."));
        }
        return ResponseEntity.ok().cacheControl(CacheControl.noStore()).body(stats.stats());
    }
}

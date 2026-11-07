package lifeos_backend.controller;

import lifeos_backend.model.User;
import lifeos_backend.service.AccountService;
import lifeos_backend.service.CurrentUser;
import lifeos_backend.service.RateLimiter;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.time.Duration;
import java.time.LocalDate;
import java.util.Map;

/**
 * The user's own account: download everything we store, or delete it all.
 *
 * Deleting needs the password again (a stolen or forgotten-open session alone is not
 * enough) and the word DELETE, and is rate limited so it cannot be used to guess
 * passwords. Export is rate limited because it reads every table.
 */
@RestController
@RequestMapping("/api/account")
public class AccountController {

    private static final int MAX_EXPORTS_PER_HOUR = 5;
    private static final int MAX_DELETE_ATTEMPTS_PER_15_MIN = 5;

    private final CurrentUser currentUser;
    private final AccountService accounts;
    private final PasswordEncoder passwordEncoder;
    private final RateLimiter rateLimiter;

    public AccountController(CurrentUser currentUser, AccountService accounts,
                             PasswordEncoder passwordEncoder, RateLimiter rateLimiter) {
        this.currentUser = currentUser;
        this.accounts = accounts;
        this.passwordEncoder = passwordEncoder;
        this.rateLimiter = rateLimiter;
    }

    /** GET /api/account/export -> lifeos-export-YYYY-MM-DD.json */
    @GetMapping("/export")
    public ResponseEntity<?> export(@RequestHeader("Authorization") String auth) {
        User u = currentUser.from(auth);
        if (!rateLimiter.tryAcquire("export:" + u.getId(), MAX_EXPORTS_PER_HOUR, Duration.ofHours(1))) {
            return ResponseEntity.status(HttpStatus.TOO_MANY_REQUESTS)
                    .body(Map.of("error", "You can download your data 5 times an hour. Please try again later."));
        }
        return ResponseEntity.ok()
                .contentType(MediaType.APPLICATION_JSON)
                .header(HttpHeaders.CONTENT_DISPOSITION,
                        "attachment; filename=\"lifeos-export-" + LocalDate.now() + ".json\"")
                .header(HttpHeaders.CACHE_CONTROL, "no-store")
                .body(accounts.export(u));
    }

    public record DeleteRequest(String password, String confirm) {}

    /** DELETE /api/account {"password":"...","confirm":"DELETE"} -> 204 */
    @DeleteMapping
    public ResponseEntity<?> delete(@RequestHeader("Authorization") String auth,
                                    @RequestBody(required = false) DeleteRequest body) {
        User u = currentUser.from(auth);
        if (!rateLimiter.tryAcquire("delete:" + u.getId(), MAX_DELETE_ATTEMPTS_PER_15_MIN, Duration.ofMinutes(15))) {
            return ResponseEntity.status(HttpStatus.TOO_MANY_REQUESTS)
                    .body(Map.of("error", "Too many attempts. Please wait 15 minutes."));
        }
        if (body == null || !"DELETE".equals(body.confirm())) {
            return ResponseEntity.badRequest().body(Map.of("error", "Type DELETE to confirm."));
        }
        if (body.password() == null || body.password().length() > 200
                || !passwordEncoder.matches(body.password(), u.getPassword())) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("error", "Password is incorrect."));
        }
        accounts.delete(u);
        return ResponseEntity.noContent().build();
    }
}

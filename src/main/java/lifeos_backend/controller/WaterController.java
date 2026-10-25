package lifeos_backend.controller;

import lifeos_backend.model.WaterLog;
import lifeos_backend.repository.WaterRepository;
import lifeos_backend.repository.UserRepository;
import lifeos_backend.service.JwtService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.time.format.DateTimeParseException;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/water")
public class WaterController {

    @Autowired private WaterRepository waterRepository;
    @Autowired private JwtService jwtService;
    @Autowired private UserRepository userRepository;

    private Long getUserId(String auth) {
        String email = jwtService.extractEmail(auth.replace("Bearer ", ""));
        return userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("User not found")).getId();
    }

    /**
     * GET /api/water
     * Optional ?date=YYYY-MM-DD param. Returns all logs if no date given,
     * or logs for the specific date. Supports the dashboard date-picker.
     */
    @GetMapping
    public ResponseEntity<List<WaterLog>> getAll(
            @RequestHeader("Authorization") String auth,
            @RequestParam(required = false) String date) {
        Long userId = getUserId(auth);
        if (date != null && !date.isBlank()) {
            try {
                return ResponseEntity.ok(
                        waterRepository.findByUserIdAndDate(userId, LocalDate.parse(date)));
            } catch (DateTimeParseException e) {
                return ResponseEntity.status(HttpStatus.BAD_REQUEST).build();
            }
        }
        return ResponseEntity.ok(waterRepository.findByUserIdOrderByDateDesc(userId));
    }

    /** GET /api/water/today — convenience alias kept for backward compat */
    @GetMapping("/today")
    public ResponseEntity<List<WaterLog>> getToday(@RequestHeader("Authorization") String auth) {
        return ResponseEntity.ok(waterRepository.findByUserIdAndDate(getUserId(auth), LocalDate.now()));
    }

    @PostMapping
    public ResponseEntity<WaterLog> log(@RequestHeader("Authorization") String auth,
                                         @RequestBody Map<String, Object> body) {
        WaterLog w = new WaterLog();
        w.setUserId(getUserId(auth));
        w.setAmountOz(Double.parseDouble(body.get("amountOz").toString()));
        // Support optional date param (for logging on a specific date); defaults to today
        String dateStr = body.containsKey("date") ? body.get("date").toString() : null;
        w.setDate(dateStr != null && !dateStr.isBlank() ? LocalDate.parse(dateStr) : LocalDate.now());
        return ResponseEntity.ok(waterRepository.save(w));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@RequestHeader("Authorization") String auth,
                                        @PathVariable Long id) {
        // Ownership check: never delete another user's row (prevents IDOR).
        // Returns 404 rather than 403 so IDs belonging to others aren't confirmed to exist.
        Long userId = getUserId(auth);
        return waterRepository.findById(id)
                .filter(row -> userId.equals(row.getUserId()))
                .map(row -> {
                    waterRepository.delete(row);
                    return ResponseEntity.ok().<Void>build();
                })
                .orElseGet(() -> ResponseEntity.notFound().build());
    }
}

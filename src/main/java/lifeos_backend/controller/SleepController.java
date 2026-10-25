package lifeos_backend.controller;

import lifeos_backend.model.SleepLog;
import lifeos_backend.repository.SleepRepository;
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
@RequestMapping("/api/sleep")
@CrossOrigin(origins = "*")
public class SleepController {

    @Autowired private SleepRepository sleepRepository;
    @Autowired private JwtService jwtService;
    @Autowired private UserRepository userRepository;

    private Long getUserId(String auth) {
        String email = jwtService.extractEmail(auth.replace("Bearer ", ""));
        return userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("User not found")).getId();
    }

    /**
     * GET /api/sleep
     * Optional ?date=YYYY-MM-DD param. Returns all logs (descending) if no date,
     * or logs for a specific date. Supports the dashboard date-picker.
     */
    @GetMapping
    public ResponseEntity<List<SleepLog>> getAll(
            @RequestHeader("Authorization") String auth,
            @RequestParam(required = false) String date) {
        Long userId = getUserId(auth);
        if (date != null && !date.isBlank()) {
            try {
                return ResponseEntity.ok(
                        sleepRepository.findByUserIdAndDate(userId, LocalDate.parse(date)));
            } catch (DateTimeParseException e) {
                return ResponseEntity.status(HttpStatus.BAD_REQUEST).build();
            }
        }
        return ResponseEntity.ok(sleepRepository.findByUserIdOrderByDateDesc(userId));
    }

    @PostMapping
    public ResponseEntity<SleepLog> log(@RequestHeader("Authorization") String auth,
                                         @RequestBody Map<String, Object> body) {
        SleepLog s = new SleepLog();
        s.setUserId(getUserId(auth));
        s.setHoursSlept(Double.parseDouble(body.get("hoursSlept").toString()));
        s.setQuality((String) body.getOrDefault("quality", "good"));
        s.setBedtime((String) body.getOrDefault("bedtime", ""));
        s.setWakeTime((String) body.getOrDefault("wakeTime", ""));
        s.setNotes((String) body.getOrDefault("notes", ""));
        // Support optional date (defaults to today)
        String dateStr = body.containsKey("date") ? body.get("date").toString() : null;
        s.setDate(dateStr != null && !dateStr.isBlank() ? LocalDate.parse(dateStr) : LocalDate.now());
        return ResponseEntity.ok(sleepRepository.save(s));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@RequestHeader("Authorization") String auth,
                                        @PathVariable Long id) {
        // Ownership check: never delete another user's row (prevents IDOR).
        // Returns 404 rather than 403 so IDs belonging to others aren't confirmed to exist.
        Long userId = getUserId(auth);
        return sleepRepository.findById(id)
                .filter(row -> userId.equals(row.getUserId()))
                .map(row -> {
                    sleepRepository.delete(row);
                    return ResponseEntity.ok().<Void>build();
                })
                .orElseGet(() -> ResponseEntity.notFound().build());
    }
}

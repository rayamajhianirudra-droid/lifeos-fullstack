package lifeos_backend.controller;

import lifeos_backend.service.LogDates;
import lifeos_backend.model.WeightLog;
import lifeos_backend.repository.WeightRepository;
import lifeos_backend.repository.UserRepository;
import lifeos_backend.service.JwtService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/weight")
public class WeightController {

    @Autowired private WeightRepository weightRepository;
    @Autowired private JwtService jwtService;
    @Autowired private UserRepository userRepository;

    private Long getUserId(String auth) {
        String email = jwtService.extractEmail(auth.replace("Bearer ", ""));
        return userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("User not found")).getId();
    }

    @GetMapping
    public ResponseEntity<List<WeightLog>> getAll(@RequestHeader("Authorization") String auth) {
        // Newest first: the app treats element 0 as the current weight.
        return ResponseEntity.ok(weightRepository.findByUserIdOrderByDateDescIdDesc(getUserId(auth)));
    }

    @PostMapping
    public ResponseEntity<WeightLog> log(@RequestHeader("Authorization") String auth,
                                          @RequestBody Map<String, Object> body) {
        Double lbs = number(body.get("weightLbs"));
        if (lbs == null || lbs < 50 || lbs > 1000) return ResponseEntity.badRequest().build();
        Object notes = body.get("notes");
        Long userId = getUserId(auth);
        WeightLog w = new WeightLog();
        w.setUserId(userId);
        w.setWeightLbs(Math.round(lbs * 10) / 10.0);
        w.setNotes(notes == null ? "" : notes.toString().substring(0, Math.min(notes.toString().length(), 300)));
        w.setDate(LogDates.resolve(body.get("date")));
        WeightLog saved = weightRepository.save(w);

        // Keep the profile weight current, so calorie and protein goals follow real progress.
        boolean isNewest = weightRepository.findByUserIdOrderByDateDescIdDesc(userId).stream()
                .findFirst().map(x -> x.getId().equals(saved.getId())).orElse(false);
        if (isNewest) {
            userRepository.findById(userId).ifPresent(u -> { u.setWeightLbs(saved.getWeightLbs()); userRepository.save(u); });
        }
        return ResponseEntity.ok(saved);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@RequestHeader("Authorization") String auth,
                                        @PathVariable Long id) {
        // Only delete the row if it belongs to the logged-in user; 404 otherwise
        // (404, not 403, so other users' IDs aren't confirmed to exist).
        Long userId = getUserId(auth);
        return weightRepository.findById(id)
                .filter(row -> userId.equals(row.getUserId()))
                .map(row -> {
                    weightRepository.delete(row);
                    return ResponseEntity.ok().<Void>build();
                })
                .orElseGet(() -> ResponseEntity.notFound().build());
    }

    static Double number(Object v) {
        if (v == null) return null;
        try {
            double d = (v instanceof Number n) ? n.doubleValue() : Double.parseDouble(v.toString());
            return Double.isFinite(d) ? d : null;
        } catch (NumberFormatException e) {
            return null;
        }
    }
}

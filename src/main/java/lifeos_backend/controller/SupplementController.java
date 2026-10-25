package lifeos_backend.controller;

import lifeos_backend.service.LogDates;
import lifeos_backend.model.SupplementLog;
import lifeos_backend.repository.SupplementRepository;
import lifeos_backend.repository.UserRepository;
import lifeos_backend.service.JwtService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/supplements")
public class SupplementController {

    @Autowired private SupplementRepository supplementRepository;
    @Autowired private JwtService jwtService;
    @Autowired private UserRepository userRepository;

    private Long getUserId(String auth) {
        String email = jwtService.extractEmail(auth.replace("Bearer ", ""));
        return userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("User not found")).getId();
    }

    @GetMapping
    public ResponseEntity<List<SupplementLog>> getAll(@RequestHeader("Authorization") String auth) {
        return ResponseEntity.ok(supplementRepository.findByUserId(getUserId(auth)));
    }

    @GetMapping("/today")
    public ResponseEntity<List<SupplementLog>> getToday(@RequestHeader("Authorization") String auth) {
        return ResponseEntity.ok(supplementRepository.findByUserIdAndDate(getUserId(auth), LocalDate.now()));
    }

    @PostMapping
    public ResponseEntity<SupplementLog> log(@RequestHeader("Authorization") String auth,
                                              @RequestBody Map<String, String> body) {
        SupplementLog s = new SupplementLog();
        s.setUserId(getUserId(auth));
        s.setSupplementName(body.get("name"));
        s.setDosage(body.get("dosage"));
        s.setUnit(body.getOrDefault("unit", "mg"));
        s.setTimeOfDay(body.getOrDefault("timeOfDay", "morning"));
        s.setDate(LogDates.resolve(body.get("date")));
        return ResponseEntity.ok(supplementRepository.save(s));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@RequestHeader("Authorization") String auth,
                                        @PathVariable Long id) {
        // Only delete the row if it belongs to the logged-in user; 404 otherwise
        // (404, not 403, so other users' IDs aren't confirmed to exist).
        Long userId = getUserId(auth);
        return supplementRepository.findById(id)
                .filter(row -> userId.equals(row.getUserId()))
                .map(row -> {
                    supplementRepository.delete(row);
                    return ResponseEntity.ok().<Void>build();
                })
                .orElseGet(() -> ResponseEntity.notFound().build());
    }
}

package lifeos_backend.controller;

import lifeos_backend.service.Inputs;
import java.util.Set;
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
        // The app sends "supplementName" (older clients sent "name"); the server used to read
        // only "name", so every supplement was saved with a blank name.
        String name = Inputs.text(body.containsKey("supplementName") ? body.get("supplementName") : body.get("name"), 80);
        if (name.isEmpty()) return ResponseEntity.badRequest().build();
        SupplementLog s = new SupplementLog();
        s.setUserId(getUserId(auth));
        s.setSupplementName(name);
        s.setDosage(Inputs.text(body.get("dosage"), 20));
        s.setUnit(Inputs.oneOf(body.get("unit"), Set.of("mg", "mcg", "g", "iu", "ml", "capsule", "tablet", "scoop"), "mg"));
        s.setTimeOfDay(Inputs.oneOf(body.get("timeOfDay"), Set.of("morning", "afternoon", "evening", "night", "with meal"), "morning"));
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

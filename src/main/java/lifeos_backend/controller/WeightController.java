package lifeos_backend.controller;

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
        return ResponseEntity.ok(weightRepository.findByUserIdOrderByDateAsc(getUserId(auth)));
    }

    @PostMapping
    public ResponseEntity<WeightLog> log(@RequestHeader("Authorization") String auth,
                                          @RequestBody Map<String, Object> body) {
        WeightLog w = new WeightLog();
        w.setUserId(getUserId(auth));
        w.setWeightLbs(Double.parseDouble(body.get("weightLbs").toString()));
        w.setNotes((String) body.getOrDefault("notes", ""));
        w.setDate(LocalDate.now());
        return ResponseEntity.ok(weightRepository.save(w));
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
}

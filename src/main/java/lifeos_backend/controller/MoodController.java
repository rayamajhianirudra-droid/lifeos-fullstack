package lifeos_backend.controller;

import lifeos_backend.service.Inputs;
import java.util.Set;
import lifeos_backend.service.LogDates;
import lifeos_backend.model.MoodLog;
import lifeos_backend.repository.MoodRepository;
import lifeos_backend.repository.UserRepository;
import lifeos_backend.service.JwtService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/mood")
public class MoodController {

    @Autowired private MoodRepository moodRepository;
    @Autowired private JwtService jwtService;
    @Autowired private UserRepository userRepository;

    private Long getUserId(String auth) {
        String email = jwtService.extractEmail(auth.replace("Bearer ", ""));
        return userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("User not found")).getId();
    }

    @GetMapping
    public ResponseEntity<List<MoodLog>> getAll(@RequestHeader("Authorization") String auth) {
        return ResponseEntity.ok(moodRepository.findByUserIdOrderByDateDesc(getUserId(auth)));
    }

    @PostMapping
    public ResponseEntity<MoodLog> log(@RequestHeader("Authorization") String auth,
                                        @RequestBody Map<String, Object> body) {
        Double score = Inputs.num(body.get("moodScore"), 1, 10);
        if (score == null) return ResponseEntity.badRequest().build();
        MoodLog m = new MoodLog();
        m.setUserId(getUserId(auth));
        m.setMoodScore((int) Math.round(score));
        m.setMoodLabel(Inputs.text(body.get("moodLabel"), 30));
        m.setEnergyLevel(Inputs.oneOf(body.get("energyLevel"), Set.of("low", "medium", "high"), "medium"));
        m.setStressLevel(Inputs.oneOf(body.get("stressLevel"), Set.of("low", "medium", "high"), "low"));
        m.setNotes(Inputs.text(body.get("notes"), 500));
        m.setDate(LogDates.resolve(body.get("date")));
        return ResponseEntity.ok(moodRepository.save(m));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@RequestHeader("Authorization") String auth,
                                        @PathVariable Long id) {
        // Only delete the row if it belongs to the logged-in user; 404 otherwise
        // (404, not 403, so other users' IDs aren't confirmed to exist).
        Long userId = getUserId(auth);
        return moodRepository.findById(id)
                .filter(row -> userId.equals(row.getUserId()))
                .map(row -> {
                    moodRepository.delete(row);
                    return ResponseEntity.ok().<Void>build();
                })
                .orElseGet(() -> ResponseEntity.notFound().build());
    }
}

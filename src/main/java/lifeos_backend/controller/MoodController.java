package lifeos_backend.controller;

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
@CrossOrigin(origins = "*")
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
        MoodLog m = new MoodLog();
        m.setUserId(getUserId(auth));
        m.setMoodScore(Integer.parseInt(body.get("moodScore").toString()));
        m.setMoodLabel((String) body.getOrDefault("moodLabel", "Neutral"));
        m.setEnergyLevel((String) body.getOrDefault("energyLevel", "medium"));
        m.setStressLevel((String) body.getOrDefault("stressLevel", "low"));
        m.setNotes((String) body.getOrDefault("notes", ""));
        m.setDate(LocalDate.now());
        return ResponseEntity.ok(moodRepository.save(m));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@RequestHeader("Authorization") String auth,
                                        @PathVariable Long id) {
        moodRepository.deleteById(id);
        return ResponseEntity.ok().build();
    }
}

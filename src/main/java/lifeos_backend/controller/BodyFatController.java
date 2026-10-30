package lifeos_backend.controller;

import lifeos_backend.model.BodyFatLog;
import lifeos_backend.model.User;
import lifeos_backend.repository.BodyFatRepository;
import lifeos_backend.service.BodyFatCalculator;
import lifeos_backend.service.CurrentUser;
import lifeos_backend.service.LogDates;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/** Body fat estimates. The % is computed on the server from tape measurements (never trusted from the client). */
@RestController
@RequestMapping("/api/bodyfat")
public class BodyFatController {

    private final BodyFatRepository repo;
    private final CurrentUser currentUser;

    public BodyFatController(BodyFatRepository repo, CurrentUser currentUser) {
        this.repo = repo;
        this.currentUser = currentUser;
    }

    @GetMapping
    public List<BodyFatLog> list(@RequestHeader("Authorization") String auth) {
        return repo.findByUserIdOrderByDateDescIdDesc(currentUser.from(auth).getId());
    }

    @PostMapping
    public ResponseEntity<?> log(@RequestHeader("Authorization") String auth, @RequestBody Map<String, Object> body) {
        User user = currentUser.from(auth);
        String sex = body.get("sex") == null ? user.getSex() : body.get("sex").toString();
        Double height = WeightController.number(body.get("heightInches"));
        if (height == null) height = (double) (user.getHeightFeet() * 12 + user.getHeightInches());
        Double waist = WeightController.number(body.get("waistInches"));
        Double neck = WeightController.number(body.get("neckInches"));
        Double hip = WeightController.number(body.get("hipInches"));
        if (waist == null || neck == null) {
            return ResponseEntity.badRequest().body(Map.of("error", "Waist and neck measurements are required."));
        }
        Double pct = BodyFatCalculator.navy(sex, height, waist, neck, hip);
        if (pct == null) {
            return ResponseEntity.badRequest().body(Map.of("error",
                    "Those measurements don't look right. Measure waist at the navel and neck just below the larynx, in inches."));
        }
        BodyFatLog b = new BodyFatLog();
        b.setUserId(user.getId());
        b.setSex(sex.toLowerCase());
        b.setHeightInches(height);
        b.setWaistInches(waist);
        b.setNeckInches(neck);
        b.setHipInches("female".equalsIgnoreCase(sex) ? hip : null);
        b.setBodyFatPercent(pct);
        b.setDate(LogDates.resolve(body.get("date")));
        return ResponseEntity.ok(repo.save(b));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@RequestHeader("Authorization") String auth, @PathVariable Long id) {
        Long userId = currentUser.from(auth).getId();
        return repo.findById(id)
                .filter(row -> userId.equals(row.getUserId()))
                .map(row -> { repo.delete(row); return ResponseEntity.ok().<Void>build(); })
                .orElseGet(() -> ResponseEntity.notFound().build());
    }
}

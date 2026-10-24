package lifeos_backend.controller;

import lifeos_backend.model.SupplementLog;
import lifeos_backend.repository.SupplementRepository;
import com.lifeos.lifeos_backend.service.JwtService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/supplements")
@CrossOrigin(origins = "*")
public class SupplementController {

    @Autowired private SupplementRepository supplementRepository;
    @Autowired private JwtService jwtService;

    private Long getUserId(String auth) {
        return jwtService.extractUserId(auth.replace("Bearer ", ""));
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
        s.setDate(LocalDate.now());
        return ResponseEntity.ok(supplementRepository.save(s));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@RequestHeader("Authorization") String auth,
                                        @PathVariable Long id) {
        supplementRepository.deleteById(id);
        return ResponseEntity.ok().build();
    }
}

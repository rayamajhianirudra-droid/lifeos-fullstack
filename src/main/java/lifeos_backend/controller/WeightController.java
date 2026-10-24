package lifeos_backend.controller;

import lifeos_backend.model.WeightLog;
import lifeos_backend.repository.WeightRepository;
import lifeos_backend.service.JwtService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/weight")
@CrossOrigin(origins = "*")
public class WeightController {

    @Autowired private WeightRepository weightRepository;
    @Autowired private JwtService jwtService;

    private Long getUserId(String auth) {
        return jwtService.extractUserId(auth.replace("Bearer ", ""));
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
        weightRepository.deleteById(id);
        return ResponseEntity.ok().build();
    }
}

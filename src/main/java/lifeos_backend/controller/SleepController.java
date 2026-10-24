package lifeos_backend.controller;

import lifeos_backend.model.SleepLog;
import lifeos_backend.repository.SleepRepository;
import com.lifeos.lifeos_backend.service.JwtService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/sleep")
@CrossOrigin(origins = "*")
public class SleepController {

    @Autowired private SleepRepository sleepRepository;
    @Autowired private JwtService jwtService;

    private Long getUserId(String auth) {
        return jwtService.extractUserId(auth.replace("Bearer ", ""));
    }

    @GetMapping
    public ResponseEntity<List<SleepLog>> getAll(@RequestHeader("Authorization") String auth) {
        return ResponseEntity.ok(sleepRepository.findByUserIdOrderByDateDesc(getUserId(auth)));
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
        s.setDate(LocalDate.now());
        return ResponseEntity.ok(sleepRepository.save(s));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@RequestHeader("Authorization") String auth,
                                        @PathVariable Long id) {
        sleepRepository.deleteById(id);
        return ResponseEntity.ok().build();
    }
}

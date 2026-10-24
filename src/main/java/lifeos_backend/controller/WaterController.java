package lifeos_backend.controller;

import lifeos_backend.model.WaterLog;
import lifeos_backend.repository.WaterRepository;
import lifeos_backend.service.JwtService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/water")
@CrossOrigin(origins = "*")
public class WaterController {

    @Autowired private WaterRepository waterRepository;
    @Autowired private JwtService jwtService;

    private Long getUserId(String auth) {
        return jwtService.extractUserId(auth.replace("Bearer ", ""));
    }

    @GetMapping
    public ResponseEntity<List<WaterLog>> getAll(@RequestHeader("Authorization") String auth) {
        return ResponseEntity.ok(waterRepository.findByUserIdOrderByDateDesc(getUserId(auth)));
    }

    @GetMapping("/today")
    public ResponseEntity<List<WaterLog>> getToday(@RequestHeader("Authorization") String auth) {
        return ResponseEntity.ok(waterRepository.findByUserIdAndDate(getUserId(auth), LocalDate.now()));
    }

    @PostMapping
    public ResponseEntity<WaterLog> log(@RequestHeader("Authorization") String auth,
                                         @RequestBody Map<String, Object> body) {
        WaterLog w = new WaterLog();
        w.setUserId(getUserId(auth));
        w.setAmountOz(Double.parseDouble(body.get("amountOz").toString()));
        w.setDate(LocalDate.now());
        return ResponseEntity.ok(waterRepository.save(w));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@RequestHeader("Authorization") String auth,
                                        @PathVariable Long id) {
        waterRepository.deleteById(id);
        return ResponseEntity.ok().build();
    }
}

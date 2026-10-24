package lifeos_backend.controller;

import lifeos_backend.model.User;
import lifeos_backend.repository.UserRepository;
import lifeos_backend.service.JwtService;
import lifeos_backend.service.WeeklyReportService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/weekly-report")
@CrossOrigin(origins = "*")
public class WeeklyReportController {

    private final WeeklyReportService weeklyReportService;
    private final JwtService jwtService;
    private final UserRepository userRepository;

    public WeeklyReportController(WeeklyReportService weeklyReportService,
                                  JwtService jwtService,
                                  UserRepository userRepository) {
        this.weeklyReportService = weeklyReportService;
        this.jwtService = jwtService;
        this.userRepository = userRepository;
    }

    private Long getUserId(String authHeader) {
        String token = authHeader.substring(7);
        String email = jwtService.extractEmail(token);
        return userRepository.findByEmail(email)
                .map(User::getId)
                .orElseThrow(() -> new RuntimeException("User not found"));
    }

    @GetMapping
    public ResponseEntity<Map<String, Object>> getWeeklyReport(
            @RequestHeader("Authorization") String authHeader) {
        Long userId = getUserId(authHeader);
        return ResponseEntity.ok(weeklyReportService.getWeeklySummary(userId));
    }
}

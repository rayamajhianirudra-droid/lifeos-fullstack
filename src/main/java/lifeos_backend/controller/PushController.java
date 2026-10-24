package lifeos_backend.controller;

import lifeos_backend.model.User;
import lifeos_backend.repository.UserRepository;
import lifeos_backend.service.PushNotificationService;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/push")
public class PushController {

    private final PushNotificationService pushService;
    private final UserRepository userRepository;

    public PushController(PushNotificationService pushService, UserRepository userRepository) {
        this.pushService = pushService;
        this.userRepository = userRepository;
    }

    @PostMapping("/subscribe")
    public Map<String, Object> subscribe(@RequestBody SubscribeRequest req) {
        User user = userRepository.findByEmail(req.userId())
                .orElseThrow(() -> new RuntimeException("User not found for email: " + req.userId()));

        pushService.saveSubscription(user.getId(), req.endpoint(), req.p256dh(), req.auth());
        return Map.of("success", true, "userId", user.getId());
    }

    @PostMapping("/check-threshold")
    public Map<String, Object> checkThreshold(@RequestBody ThresholdRequest req) throws Exception {
        User user = userRepository.findByEmail(req.userId())
                .orElseThrow(() -> new RuntimeException("User not found for email: " + req.userId()));

        pushService.checkAndSend(user.getId(), req.totalCalories(), req.calorieGoal());
        return Map.of("success", true);
    }

    // Note: "userId" field name kept as-is for frontend compatibility, but it actually holds an email
    public record SubscribeRequest(String userId, String endpoint, String p256dh, String auth) {}
    public record ThresholdRequest(String userId, double totalCalories, double calorieGoal) {}
}

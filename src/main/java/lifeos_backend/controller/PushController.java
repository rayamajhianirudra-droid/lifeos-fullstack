package lifeos_backend.controller;

import lifeos_backend.model.User;
import lifeos_backend.repository.UserRepository;
import lifeos_backend.service.JwtService;
import lifeos_backend.service.PushNotificationService;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/push")
public class PushController {

    private final PushNotificationService pushService;
    private final JwtService jwtService;
    private final UserRepository userRepository;

    public PushController(PushNotificationService pushService, UserRepository userRepository, JwtService jwtService) {
        this.pushService = pushService;
        this.jwtService = jwtService;
        this.userRepository = userRepository;
    }

    @PostMapping("/subscribe")
    public Map<String, Object> subscribe(@RequestHeader("Authorization") String auth,
                                         @RequestBody SubscribeRequest req) {
        // Identity comes from the JWT, never from the request body.
        User user = currentUser(auth);

        pushService.saveSubscription(user.getId(), req.endpoint(), req.p256dh(), req.auth());
        return Map.of("success", true);
    }

    @PostMapping("/check-threshold")
    public Map<String, Object> checkThreshold(@RequestHeader("Authorization") String auth,
                                              @RequestBody ThresholdRequest req) throws Exception {
        User user = currentUser(auth);

        pushService.checkAndSend(user.getId(), req.totalCalories(), req.calorieGoal());
        return Map.of("success", true);
    }

    private User currentUser(String auth) {
        String email = jwtService.extractEmail(auth.replace("Bearer ", ""));
        return userRepository.findByEmail(email)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED));
    }

    // Note: "userId" is now ignored (identity comes from the JWT); field kept as-is for frontend compatibility, but it actually holds an email
    public record SubscribeRequest(String userId, String endpoint, String p256dh, String auth) {}
    public record ThresholdRequest(String userId, double totalCalories, double calorieGoal) {}
}

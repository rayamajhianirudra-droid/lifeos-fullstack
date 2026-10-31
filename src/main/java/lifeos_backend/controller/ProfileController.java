package lifeos_backend.controller;

import lifeos_backend.model.User;
import lifeos_backend.repository.UserRepository;
import lifeos_backend.service.CurrentUser;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Set;

/**
 * The user's body/goal settings, saved to the ACCOUNT (they used to live only in the
 * browser and were lost when site data was cleared or on another device).
 */
@RestController
@RequestMapping("/api/profile")
public class ProfileController {

    private static final Set<String> SEXES = Set.of("male", "female");
    private static final Set<String> GOALS = Set.of("lose", "maintain", "gain");
    private static final Set<String> ACTIVITY = Set.of("sedentary", "light", "moderate", "active", "veryactive");

    private final CurrentUser currentUser;
    private final UserRepository userRepository;

    public ProfileController(CurrentUser currentUser, UserRepository userRepository) {
        this.currentUser = currentUser;
        this.userRepository = userRepository;
    }

    @GetMapping
    public Map<String, Object> get(@RequestHeader("Authorization") String auth) {
        return toMap(currentUser.from(auth));
    }

    @PutMapping
    public ResponseEntity<?> update(@RequestHeader("Authorization") String auth, @RequestBody Map<String, Object> body) {
        User u = currentUser.from(auth);
        Double age = WeightController.number(body.get("age"));
        Double weight = WeightController.number(body.get("weightLbs"));
        Double ft = WeightController.number(body.get("heightFeet"));
        Double in = WeightController.number(body.get("heightInches"));
        String sex = str(body.get("sex"));
        String goal = str(body.get("goal"));
        String activity = str(body.get("activity"));

        if (age == null || age < 13 || age > 100
                || weight == null || weight < 50 || weight > 1000
                || ft == null || ft < 3 || ft > 8
                || in == null || in < 0 || in >= 12
                || !SEXES.contains(sex) || !GOALS.contains(goal) || !ACTIVITY.contains(activity)) {
            return ResponseEntity.badRequest().body(Map.of("error", "Please check your profile values."));
        }
        u.setAge((int) Math.round(age));
        u.setWeightLbs(Math.round(weight * 10) / 10.0);
        u.setHeightFeet((int) Math.round(ft));
        u.setHeightInches((int) Math.round(in));
        u.setSex(sex);
        u.setGoal(goal);
        u.setActivity(activity);
        Object name = body.get("name");
        if (name != null && !name.toString().isBlank() && name.toString().length() <= 60) u.setName(name.toString().trim());
        return ResponseEntity.ok(toMap(userRepository.save(u)));
    }

    private static Map<String, Object> toMap(User u) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("name", u.getName());
        m.put("age", u.getAge());
        m.put("sex", u.getSex());
        m.put("weightLbs", u.getWeightLbs());
        m.put("heightFeet", u.getHeightFeet());
        m.put("heightInches", u.getHeightInches());
        m.put("goal", u.getGoal());
        m.put("activity", u.getActivity());
        return m;
    }

    private static String str(Object o) {
        return o == null ? null : o.toString().trim().toLowerCase();
    }
}

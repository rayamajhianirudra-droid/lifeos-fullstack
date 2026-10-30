package lifeos_backend.controller;

import lifeos_backend.service.Inputs;
import java.util.Set;
import lifeos_backend.service.LogDates;
import lifeos_backend.model.CustomFood;
import lifeos_backend.model.FoodLog;
import lifeos_backend.repository.CustomFoodRepository;
import lifeos_backend.repository.FoodLogRepository;
import lifeos_backend.repository.UserRepository;
import lifeos_backend.service.JwtService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/custom-foods")
public class CustomFoodController {

    @Autowired private CustomFoodRepository customFoodRepository;
    @Autowired private FoodLogRepository foodLogRepository;
    @Autowired private JwtService jwtService;
    @Autowired private UserRepository userRepository;

    private Long getUserId(String auth) {
        String email = jwtService.extractEmail(auth.replace("Bearer ", ""));
        return userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("User not found")).getId();
    }

    @GetMapping
    public ResponseEntity<List<CustomFood>> getAll(@RequestHeader("Authorization") String auth) {
        return ResponseEntity.ok(customFoodRepository.findByUserId(getUserId(auth)));
    }

    @GetMapping("/search")
    public ResponseEntity<List<CustomFood>> search(@RequestHeader("Authorization") String auth,
                                                    @RequestParam String q) {
        return ResponseEntity.ok(customFoodRepository.findByUserIdAndFoodNameContainingIgnoreCase(getUserId(auth), q));
    }

    @PostMapping
    public ResponseEntity<CustomFood> create(@RequestHeader("Authorization") String auth,
                                              @RequestBody Map<String, Object> body) {
        String name = Inputs.text(body.get("foodName"), 120);
        Double kcal = Inputs.num(body.get("calories"), 0, 5000);
        Double p = body.get("protein") == null || body.get("protein").toString().isBlank() ? Double.valueOf(0) : Inputs.num(body.get("protein"), 0, 500);
        Double c = body.get("carbs") == null || body.get("carbs").toString().isBlank() ? Double.valueOf(0) : Inputs.num(body.get("carbs"), 0, 500);
        Double f = body.get("fat") == null || body.get("fat").toString().isBlank() ? Double.valueOf(0) : Inputs.num(body.get("fat"), 0, 500);
        Double size = body.get("servingSize") == null ? Double.valueOf(100) : Inputs.num(body.get("servingSize"), 0.1, 5000);
        if (name.isEmpty() || kcal == null || p == null || c == null || f == null || size == null) {
            return ResponseEntity.badRequest().build();
        }
        CustomFood cf = new CustomFood();
        cf.setUserId(getUserId(auth));
        cf.setFoodName(name);
        cf.setCalories(kcal);
        cf.setProtein(p);
        cf.setCarbs(c);
        cf.setFat(f);
        cf.setServingSize(size);
        cf.setServingUnit(Inputs.oneOf(body.get("servingUnit"), Set.of("g", "ml", "oz", "cup", "piece", "serving", "tbsp", "tsp", "slice"), "g"));
        return ResponseEntity.ok(customFoodRepository.save(cf));
    }

    @PostMapping("/{id}/log")
    public ResponseEntity<FoodLog> logCustomFood(@RequestHeader("Authorization") String auth,
                                                  @PathVariable Long id,
                                                  @RequestBody Map<String, String> body) {
        Long userId = getUserId(auth);
        CustomFood cf = customFoodRepository.findById(id)
                .filter(row -> userId.equals(row.getUserId()))
                .orElse(null);
        if (cf == null) return ResponseEntity.notFound().build();
        FoodLog fl = new FoodLog();
        fl.setUserId(userId);
        fl.setFoodName(cf.getFoodName());
        fl.setCalories(cf.getCalories());
        fl.setProtein(cf.getProtein());
        fl.setCarbs(cf.getCarbs());
        fl.setFat(cf.getFat());
        fl.setDate(LogDates.resolve(body.get("date")));
        fl.setMealType(body.getOrDefault("mealType", "snack"));
        fl.setInsight("Custom food logged ✨");
        return ResponseEntity.ok(foodLogRepository.save(fl));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@RequestHeader("Authorization") String auth,
                                        @PathVariable Long id) {
        // Only delete the row if it belongs to the logged-in user; 404 otherwise
        // (404, not 403, so other users' IDs aren't confirmed to exist).
        Long userId = getUserId(auth);
        return customFoodRepository.findById(id)
                .filter(row -> userId.equals(row.getUserId()))
                .map(row -> {
                    customFoodRepository.delete(row);
                    return ResponseEntity.ok().<Void>build();
                })
                .orElseGet(() -> ResponseEntity.notFound().build());
    }
}

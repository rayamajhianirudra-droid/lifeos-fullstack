package lifeos_backend.controller;

import lifeos_backend.model.CustomFood;
import lifeos_backend.model.FoodLog;
import lifeos_backend.repository.CustomFoodRepository;
import lifeos_backend.repository.FoodLogRepository;
import lifeos_backend.service.JwtService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/custom-foods")
@CrossOrigin(origins = "*")
public class CustomFoodController {

    @Autowired private CustomFoodRepository customFoodRepository;
    @Autowired private FoodLogRepository foodLogRepository;
    @Autowired private JwtService jwtService;

    private Long getUserId(String auth) {
        return jwtService.extractEmail(auth.replace("Bearer ", ""));
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
        CustomFood cf = new CustomFood();
        cf.setUserId(getUserId(auth));
        cf.setFoodName((String) body.get("foodName"));
        cf.setCalories(Double.parseDouble(body.get("calories").toString()));
        cf.setProtein(Double.parseDouble(body.getOrDefault("protein", "0").toString()));
        cf.setCarbs(Double.parseDouble(body.getOrDefault("carbs", "0").toString()));
        cf.setFat(Double.parseDouble(body.getOrDefault("fat", "0").toString()));
        cf.setServingSize(Double.parseDouble(body.getOrDefault("servingSize", "100").toString()));
        cf.setServingUnit((String) body.getOrDefault("servingUnit", "g"));
        return ResponseEntity.ok(customFoodRepository.save(cf));
    }

    @PostMapping("/{id}/log")
    public ResponseEntity<FoodLog> logCustomFood(@RequestHeader("Authorization") String auth,
                                                  @PathVariable Long id,
                                                  @RequestBody Map<String, String> body) {
        Long userId = getUserId(auth);
        CustomFood cf = customFoodRepository.findById(id).orElseThrow();
        FoodLog fl = new FoodLog();
        fl.setUserId(userId);
        fl.setFoodName(cf.getFoodName());
        fl.setCalories(cf.getCalories());
        fl.setProtein(cf.getProtein());
        fl.setCarbs(cf.getCarbs());
        fl.setFat(cf.getFat());
        fl.setDate(LocalDate.now());
        fl.setMealType(body.getOrDefault("mealType", "snack"));
        fl.setInsight("Custom food logged ✨");
        return ResponseEntity.ok(foodLogRepository.save(fl));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@RequestHeader("Authorization") String auth,
                                        @PathVariable Long id) {
        customFoodRepository.deleteById(id);
        return ResponseEntity.ok().build();
    }
}

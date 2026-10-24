package lifeos_backend.controller;

import lifeos_backend.model.PlanExercise;
import lifeos_backend.model.WorkoutPlan;
import lifeos_backend.repository.PlanExerciseRepository;
import lifeos_backend.repository.WorkoutPlanRepository;
import lifeos_backend.service.JwtService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/workout-plans")
@CrossOrigin(origins = "*")
public class WorkoutPlanController {

    @Autowired private WorkoutPlanRepository workoutPlanRepository;
    @Autowired private PlanExerciseRepository planExerciseRepository;
    @Autowired private JwtService jwtService;

    private Long getUserId(String auth) {
        return jwtService.extractEmail(auth.replace("Bearer ", ""));
    }

    @GetMapping
    public ResponseEntity<List<WorkoutPlan>> getAll(@RequestHeader("Authorization") String auth) {
        List<WorkoutPlan> plans = workoutPlanRepository.findByUserId(getUserId(auth));
        for (WorkoutPlan p : plans) {
            p.setExercises(planExerciseRepository.findByWorkoutPlanIdOrderByOrderIndexAsc(p.getId()));
        }
        return ResponseEntity.ok(plans);
    }

    @PostMapping
    public ResponseEntity<WorkoutPlan> create(@RequestHeader("Authorization") String auth,
                                               @RequestBody Map<String, Object> body) {
        WorkoutPlan plan = new WorkoutPlan();
        plan.setUserId(getUserId(auth));
        plan.setPlanName((String) body.get("planName"));
        plan.setDescription((String) body.getOrDefault("description", ""));
        WorkoutPlan saved = workoutPlanRepository.save(plan);

        @SuppressWarnings("unchecked")
        List<Map<String, Object>> exList = (List<Map<String, Object>>) body.getOrDefault("exercises", new ArrayList<>());
        List<PlanExercise> exercises = new ArrayList<>();
        for (int i = 0; i < exList.size(); i++) {
            Map<String, Object> ex = exList.get(i);
            PlanExercise pe = new PlanExercise();
            pe.setWorkoutPlan(saved);
            pe.setExerciseName((String) ex.get("exerciseName"));
            pe.setSets(Integer.parseInt(ex.getOrDefault("sets", "3").toString()));
            pe.setReps(Integer.parseInt(ex.getOrDefault("reps", "10").toString()));
            pe.setNotes((String) ex.getOrDefault("notes", ""));
            pe.setOrderIndex(i);
            exercises.add(pe);
        }
        planExerciseRepository.saveAll(exercises);
        saved.setExercises(exercises);
        return ResponseEntity.ok(saved);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@RequestHeader("Authorization") String auth,
                                        @PathVariable Long id) {
        workoutPlanRepository.deleteById(id);
        return ResponseEntity.ok().build();
    }
}

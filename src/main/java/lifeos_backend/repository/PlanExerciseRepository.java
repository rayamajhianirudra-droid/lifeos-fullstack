package lifeos_backend.repository;

import lifeos_backend.model.PlanExercise;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface PlanExerciseRepository extends JpaRepository<PlanExercise, Long> {
    List<PlanExercise> findByWorkoutPlanIdOrderByOrderIndexAsc(Long planId);
}

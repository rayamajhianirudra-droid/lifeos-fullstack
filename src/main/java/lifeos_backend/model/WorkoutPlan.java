package lifeos_backend.model;

import jakarta.persistence.*;
import java.util.List;

@Entity
@Table(name = "workout_plans")
public class WorkoutPlan {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    private Long userId;
    private String planName;
    private String description;

    @OneToMany(mappedBy = "workoutPlan", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<PlanExercise> exercises;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public Long getUserId() { return userId; }
    public void setUserId(Long userId) { this.userId = userId; }
    public String getPlanName() { return planName; }
    public void setPlanName(String planName) { this.planName = planName; }
    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }
    public List<PlanExercise> getExercises() { return exercises; }
    public void setExercises(List<PlanExercise> exercises) { this.exercises = exercises; }
}

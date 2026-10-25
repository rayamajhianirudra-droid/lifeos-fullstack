package lifeos_backend.service;

import lifeos_backend.model.ExerciseLog;
import lifeos_backend.repository.ExerciseRepository;
import org.springframework.stereotype.Service;
import java.time.LocalDate;
import java.util.List;

@Service
public class ExerciseService {

    private final ExerciseRepository exerciseRepository;

    public ExerciseService(ExerciseRepository exerciseRepository) {
        this.exerciseRepository = exerciseRepository;
    }

    public ExerciseLog logExercise(ExerciseLog log) {
        return exerciseRepository.save(log);
    }

    public List<ExerciseLog> getExercisesByUserAndDate(Long userId, LocalDate date) {
        return exerciseRepository.findByUserIdAndDate(userId, date);
    }

    public List<ExerciseLog> getExercisesByUser(Long userId) {
        return exerciseRepository.findByUserId(userId);
    }

    /** Deletes the log only if it belongs to userId. Returns false if not found / not owned. */
    public boolean deleteExerciseForUser(Long id, Long userId) {
        return exerciseRepository.findById(id)
                .filter(row -> userId.equals(row.getUserId()))
                .map(row -> { exerciseRepository.delete(row); return true; })
                .orElse(false);
    }
}
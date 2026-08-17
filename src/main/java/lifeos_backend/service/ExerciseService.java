package com.lifeos.lifeos_backend.service;

import com.lifeos.lifeos_backend.model.ExerciseLog;
import com.lifeos.lifeos_backend.repository.ExerciseRepository;
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

    public void deleteExercise(Long id) {
        exerciseRepository.deleteById(id);
    }
}
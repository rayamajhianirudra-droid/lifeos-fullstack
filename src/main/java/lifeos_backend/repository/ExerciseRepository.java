package com.lifeos.lifeos_backend.repository;

import com.lifeos.lifeos_backend.model.ExerciseLog;
import org.springframework.data.jpa.repository.JpaRepository;
import java.time.LocalDate;
import java.util.List;

public interface ExerciseRepository extends JpaRepository<ExerciseLog, Long> {
    List<ExerciseLog> findByUserIdAndDate(Long userId, LocalDate date);
    List<ExerciseLog> findByUserId(Long userId);
}
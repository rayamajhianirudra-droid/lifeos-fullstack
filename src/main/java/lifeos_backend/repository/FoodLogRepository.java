package com.lifeos.lifeos_backend.repository;

import com.lifeos.lifeos_backend.model.FoodLog;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import java.time.LocalDate;
import java.util.List;

@Repository
public interface FoodLogRepository extends JpaRepository<FoodLog, Long> {
    List<FoodLog> findByUserId(Long userId);
    List<FoodLog> findByUserIdAndDate(Long userId, LocalDate date);

    @Query("SELECT DISTINCT f.date FROM FoodLog f WHERE f.userId = :userId ORDER BY f.date DESC")
    List<LocalDate> findDistinctDatesByUserId(@Param("userId") Long userId);
}
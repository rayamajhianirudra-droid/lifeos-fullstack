package com.lifeos.lifeos_backend.repository;

import com.lifeos.lifeos_backend.model.WeightEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface WeightRepository extends JpaRepository<WeightEntity, Long> {
    List<WeightEntity> findByUserIdOrderByDateDesc(Long userId);
}
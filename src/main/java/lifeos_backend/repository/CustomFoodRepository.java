package lifeos_backend.repository;

import lifeos_backend.model.CustomFood;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface CustomFoodRepository extends JpaRepository<CustomFood, Long> {
    List<CustomFood> findByUserId(Long userId);
    List<CustomFood> findByUserIdAndFoodNameContainingIgnoreCase(Long userId, String name);
}

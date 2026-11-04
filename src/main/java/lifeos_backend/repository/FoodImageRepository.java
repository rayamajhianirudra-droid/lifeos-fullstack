package lifeos_backend.repository;

import lifeos_backend.model.FoodImage;
import org.springframework.data.jpa.repository.JpaRepository;

public interface FoodImageRepository extends JpaRepository<FoodImage, String> {
}

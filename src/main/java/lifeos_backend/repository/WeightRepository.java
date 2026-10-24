package lifeos_backend.repository;

import lifeos_backend.model.WeightLog;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface WeightRepository extends JpaRepository<WeightLog, Long> {
    List<WeightLog> findByUserIdOrderByDateAsc(Long userId);
    List<WeightLog> findByUserIdOrderByDateDesc(Long userId);
}

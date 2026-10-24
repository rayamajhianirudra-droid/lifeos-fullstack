package lifeos_backend.repository;

import lifeos_backend.model.WaterLog;
import org.springframework.data.jpa.repository.JpaRepository;
import java.time.LocalDate;
import java.util.List;

public interface WaterRepository extends JpaRepository<WaterLog, Long> {
    List<WaterLog> findByUserId(Long userId);
    List<WaterLog> findByUserIdAndDate(Long userId, LocalDate date);
    List<WaterLog> findByUserIdOrderByDateDesc(Long userId);
}

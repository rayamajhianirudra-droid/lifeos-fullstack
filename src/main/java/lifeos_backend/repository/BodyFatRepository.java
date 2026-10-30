package lifeos_backend.repository;

import lifeos_backend.model.BodyFatLog;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface BodyFatRepository extends JpaRepository<BodyFatLog, Long> {
    List<BodyFatLog> findByUserIdOrderByDateDescIdDesc(Long userId);
}

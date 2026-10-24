package lifeos_backend.repository;

import lifeos_backend.model.SupplementLog;
import org.springframework.data.jpa.repository.JpaRepository;
import java.time.LocalDate;
import java.util.List;

public interface SupplementRepository extends JpaRepository<SupplementLog, Long> {
    List<SupplementLog> findByUserId(Long userId);
    List<SupplementLog> findByUserIdAndDate(Long userId, LocalDate date);
}

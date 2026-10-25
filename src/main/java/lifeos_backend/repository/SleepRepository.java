package lifeos_backend.repository;

import lifeos_backend.model.SleepLog;
import org.springframework.data.jpa.repository.JpaRepository;
import java.time.LocalDate;
import java.util.List;

public interface SleepRepository extends JpaRepository<SleepLog, Long> {
    List<SleepLog> findByUserId(Long userId);
    List<SleepLog> findByUserIdAndDate(Long userId, LocalDate date);
    List<SleepLog> findByUserIdAndDateBetweenOrderByDateAsc(Long userId, LocalDate start, LocalDate end);
    List<SleepLog> findByUserIdOrderByDateDesc(Long userId);
}

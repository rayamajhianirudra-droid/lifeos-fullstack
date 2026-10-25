package lifeos_backend.repository;

import lifeos_backend.model.MoodLog;
import org.springframework.data.jpa.repository.JpaRepository;
import java.time.LocalDate;
import java.util.List;

public interface MoodRepository extends JpaRepository<MoodLog, Long> {
    List<MoodLog> findByUserId(Long userId);
    List<MoodLog> findByUserIdAndDate(Long userId, LocalDate date);
    List<MoodLog> findByUserIdAndDateBetweenOrderByDateAsc(Long userId, LocalDate start, LocalDate end);
    List<MoodLog> findByUserIdOrderByDateDesc(Long userId);
}

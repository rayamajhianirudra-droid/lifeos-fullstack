package lifeos_backend.repository;

import lifeos_backend.model.NotificationLogEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface NotificationLogRepository extends JpaRepository<NotificationLogEntity, Long> {
    List<NotificationLogEntity> findByUserIdOrderBySentAtDesc(Long userId);
}

package lifeos_backend.repository;

import lifeos_backend.model.PushSubscriptionEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface PushSubscriptionRepository extends JpaRepository<PushSubscriptionEntity, Long> {
    List<PushSubscriptionEntity> findByUserId(Long userId);
    Optional<PushSubscriptionEntity> findByUserIdAndEndpoint(Long userId, String endpoint);
    void deleteByUserId(Long userId);
}

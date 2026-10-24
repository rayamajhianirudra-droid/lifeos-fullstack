package lifeos_backend.service;

import lifeos_backend.model.NotificationLogEntity;
import lifeos_backend.model.PushSubscriptionEntity;
import lifeos_backend.repository.NotificationLogRepository;
import lifeos_backend.repository.PushSubscriptionRepository;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class PushNotificationService {

    private final PushSubscriptionRepository pushSubscriptionRepository;
    private final NotificationLogRepository notificationLogRepository;

    public PushNotificationService(PushSubscriptionRepository pushSubscriptionRepository,
                                   NotificationLogRepository notificationLogRepository) {
        this.pushSubscriptionRepository = pushSubscriptionRepository;
        this.notificationLogRepository = notificationLogRepository;
    }

    /**
     * Save or update a user's push subscription (endpoint + VAPID keys).
     */
    public void saveSubscription(Long userId, String endpoint, String p256dh, String auth) {
        pushSubscriptionRepository.findByUserIdAndEndpoint(userId, endpoint)
                .ifPresentOrElse(
                        existing -> {
                            existing.setP256dh(p256dh);
                            existing.setAuth(auth);
                            pushSubscriptionRepository.save(existing);
                        },
                        () -> {
                            PushSubscriptionEntity sub = new PushSubscriptionEntity();
                            sub.setUserId(userId);
                            sub.setEndpoint(endpoint);
                            sub.setP256dh(p256dh);
                            sub.setAuth(auth);
                            pushSubscriptionRepository.save(sub);
                        }
                );
    }

    /**
     * Check if user has hit their calorie threshold and log a notification if so.
     * Actual web-push delivery can be wired in later via a VAPID library;
     * for now we record the event so the frontend can poll for it.
     */
    public void checkAndSend(Long userId, double totalCalories, double calorieGoal) {
        if (totalCalories >= calorieGoal * 0.90) {
            List<PushSubscriptionEntity> subs = pushSubscriptionRepository.findByUserId(userId);
            if (!subs.isEmpty()) {
                String msg = totalCalories >= calorieGoal
                        ? String.format("You've reached your %.0f kcal goal today! Great job 🎉", calorieGoal)
                        : String.format("You're at %.0f / %.0f kcal — almost at your goal!", totalCalories, calorieGoal);

                NotificationLogEntity log = new NotificationLogEntity();
                log.setUserId(userId);
                log.setMessage(msg);
                notificationLogRepository.save(log);
            }
        }
    }

    /**
     * Return recent notification log entries for a user (for frontend polling).
     */
    public List<NotificationLogEntity> getRecentNotifications(Long userId) {
        return notificationLogRepository.findByUserIdOrderBySentAtDesc(userId);
    }
}

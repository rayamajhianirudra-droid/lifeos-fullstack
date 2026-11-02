package lifeos_backend.service;

import org.springframework.stereotype.Component;

import java.time.Instant;
import java.util.concurrent.atomic.AtomicLong;

/**
 * In-memory usage counters for the admin dashboard: totals only, no user ids,
 * no search text, no messages. They reset when the server restarts (deploys,
 * Render restarts), and the dashboard says so; nothing here is stored.
 */
@Component
public class UsageCounters {

    private final Instant since = Instant.now();
    private final AtomicLong foodSearches = new AtomicLong();
    private final AtomicLong foodSearchFailures = new AtomicLong();
    private final AtomicLong coachMessages = new AtomicLong();
    private final AtomicLong coachFallbacks = new AtomicLong();

    public void foodSearch(boolean ok) {
        foodSearches.incrementAndGet();
        if (!ok) foodSearchFailures.incrementAndGet();
    }

    public void coachMessage(boolean answeredByAi) {
        coachMessages.incrementAndGet();
        if (!answeredByAi) coachFallbacks.incrementAndGet();
    }

    public Instant since() { return since; }
    public long foodSearches() { return foodSearches.get(); }
    public long foodSearchFailures() { return foodSearchFailures.get(); }
    public long coachMessages() { return coachMessages.get(); }
    public long coachFallbacks() { return coachFallbacks.get(); }
}

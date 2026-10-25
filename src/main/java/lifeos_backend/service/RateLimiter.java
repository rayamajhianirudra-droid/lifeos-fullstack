package lifeos_backend.service;

import jakarta.servlet.http.HttpServletRequest;
import org.springframework.stereotype.Component;

import java.time.Duration;
import java.util.ArrayDeque;
import java.util.Deque;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Small in-memory sliding-window rate limiter (no extra dependencies).
 *
 * Good for a single backend instance, which is how LifeOS runs on Railway today.
 * If the backend is ever scaled to several instances, move these counters to a
 * shared store (Redis or a Postgres table) so limits apply across instances.
 */
@Component
public class RateLimiter {

    /** Longest window any caller uses; entries older than this are always stale. */
    private static final long MAX_WINDOW_MS = Duration.ofHours(1).toMillis();
    /** Hard cap on tracked keys so the map can never grow without bound. */
    private static final int MAX_KEYS = 50_000;

    private final Map<String, Deque<Long>> events = new ConcurrentHashMap<>();

    /** Number of events recorded for key within the window. Does not record anything. */
    public int count(String key, Duration window) {
        Deque<Long> q = events.get(key);
        if (q == null) return 0;
        long cutoff = System.currentTimeMillis() - window.toMillis();
        synchronized (q) {
            prune(q, System.currentTimeMillis() - MAX_WINDOW_MS);
            int n = 0;
            for (Long t : q) if (t >= cutoff) n++;
            return n;
        }
    }

    /** Records one event for key. */
    public void record(String key) {
        long now = System.currentTimeMillis();
        if (events.size() > MAX_KEYS) evictStale(now - MAX_WINDOW_MS);
        Deque<Long> q = events.computeIfAbsent(key, k -> new ArrayDeque<>());
        synchronized (q) {
            prune(q, now - MAX_WINDOW_MS);
            q.addLast(now);
        }
    }

    /** Records an event if under the limit. Returns false (and records nothing) when over it. */
    public boolean tryAcquire(String key, int limit, Duration window) {
        if (count(key, window) >= limit) return false;
        record(key);
        return true;
    }

    /** Forget all events for key (e.g. after a successful login). */
    public void reset(String key) {
        events.remove(key);
    }

    /**
     * Best-effort client IP. Railway's proxy appends the real client address as the
     * LAST X-Forwarded-For entry; earlier entries can be forged by the client, so we
     * never trust them. IP limits are kept generous because many users can share an IP.
     */
    public static String clientIp(HttpServletRequest request) {
        String xff = request.getHeader("X-Forwarded-For");
        if (xff != null && !xff.isBlank()) {
            String[] parts = xff.split(",");
            return parts[parts.length - 1].trim();
        }
        return request.getRemoteAddr();
    }

    private static void prune(Deque<Long> q, long cutoff) {
        while (!q.isEmpty() && q.peekFirst() < cutoff) q.pollFirst();
    }

    private void evictStale(long cutoff) {
        events.entrySet().removeIf(e -> {
            Deque<Long> q = e.getValue();
            synchronized (q) {
                prune(q, cutoff);
                return q.isEmpty();
            }
        });
    }
}

package lifeos_backend.service;

import org.springframework.stereotype.Component;

import java.time.LocalDateTime;
import java.util.Locale;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Remembers, for one minute, whether an account exists and when it was created, so
 * JwtFilter does not run a database query on every request (one extra round trip to
 * Neon each time).
 *
 * Safety: AccountService calls forget() when an account is deleted, so deletion still
 * ends that account's sessions at once on this server.
 */
@Component
public class SessionCheckCache {

    static final long TTL_MILLIS = 60_000;
    private static final int MAX_ENTRIES = 10_000;

    /** What we know about an account: whether it exists and its creation time (may be null for old rows). */
    public record Account(boolean exists, LocalDateTime createdAt) {
        public static final Account GONE = new Account(false, null);
    }

    private record Slot(Account account, long expiresAt) {}

    private final Map<String, Slot> map = new ConcurrentHashMap<>();

    /** The cached answer, or null when we have to ask the database. */
    public Account get(String email) {
        Slot s = map.get(key(email));
        if (s == null) return null;
        if (s.expiresAt() < System.currentTimeMillis()) {
            map.remove(key(email));
            return null;
        }
        return s.account();
    }

    public void put(String email, Account account) {
        if (map.size() >= MAX_ENTRIES) map.clear();   // crude bound; entries are tiny and refill quickly
        map.put(key(email), new Slot(account, System.currentTimeMillis() + TTL_MILLIS));
    }

    public void forget(String email) {
        map.remove(key(email));
    }

    private static String key(String email) {
        return email == null ? "" : email.trim().toLowerCase(Locale.ROOT);
    }
}

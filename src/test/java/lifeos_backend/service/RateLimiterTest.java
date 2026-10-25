package lifeos_backend.service;

import org.junit.jupiter.api.Test;

import java.time.Duration;

import static org.junit.jupiter.api.Assertions.*;

class RateLimiterTest {

    private final RateLimiter limiter = new RateLimiter();
    private final Duration window = Duration.ofMinutes(15);

    @Test
    void allowsUpToLimitThenBlocks() {
        for (int i = 0; i < 3; i++) {
            assertTrue(limiter.tryAcquire("k", 3, window), "attempt " + (i + 1) + " should pass");
        }
        assertFalse(limiter.tryAcquire("k", 3, window), "4th attempt must be blocked");
        assertEquals(3, limiter.count("k", window), "blocked attempts are not recorded");
    }

    @Test
    void keysAreIndependent() {
        limiter.tryAcquire("a", 1, window);
        assertFalse(limiter.tryAcquire("a", 1, window));
        assertTrue(limiter.tryAcquire("b", 1, window));
    }

    @Test
    void resetClearsCount() {
        limiter.record("login");
        limiter.record("login");
        assertEquals(2, limiter.count("login", window));
        limiter.reset("login");
        assertEquals(0, limiter.count("login", window));
    }

    @Test
    void countIsZeroForUnknownKey() {
        assertEquals(0, limiter.count("never-seen", window));
    }
}

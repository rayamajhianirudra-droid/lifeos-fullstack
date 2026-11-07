package lifeos_backend.service;

import org.junit.jupiter.api.Test;

import java.time.LocalDateTime;

import static org.junit.jupiter.api.Assertions.*;

class SessionCheckCacheTest {

    @Test
    void remembersAndForgetsAccounts() {
        SessionCheckCache c = new SessionCheckCache();
        assertNull(c.get("a@b.com"));
        LocalDateTime t = LocalDateTime.now();
        c.put("A@B.com ", new SessionCheckCache.Account(true, t));
        assertEquals(t, c.get("a@b.com").createdAt());          // case and spaces do not matter
        c.forget("a@B.com");
        assertNull(c.get("a@b.com"));                            // deletion takes effect at once
        c.put("gone@b.com", SessionCheckCache.Account.GONE);
        assertFalse(c.get("gone@b.com").exists());
    }
}

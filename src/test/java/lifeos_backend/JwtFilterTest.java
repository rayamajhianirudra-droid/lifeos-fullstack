package lifeos_backend;

import org.junit.jupiter.api.Test;

import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.Date;

import static org.junit.jupiter.api.Assertions.*;

class JwtFilterTest {

    private static Date at(LocalDateTime t) { return Date.from(t.atZone(ZoneId.systemDefault()).toInstant()); }

    @Test
    void tokenFromTheCurrentAccountIsAccepted() {
        LocalDateTime created = LocalDateTime.now().minusDays(3);
        assertTrue(JwtFilter.belongsToCurrentAccount(at(created.plusHours(1)), created));
        // iat is whole seconds, so it can read slightly before createdAt at sign-up
        assertTrue(JwtFilter.belongsToCurrentAccount(at(created.minusNanos(900_000_000)), created));
    }

    @Test
    void tokenFromBeforeTheAccountExistedIsRejected() {
        // Account deleted and re-created with the same email: the old token must not work.
        LocalDateTime recreated = LocalDateTime.now().minusMinutes(5);
        assertFalse(JwtFilter.belongsToCurrentAccount(at(recreated.minusDays(1)), recreated));
    }

    @Test
    void neverLocksOutOnMissingData() {
        assertTrue(JwtFilter.belongsToCurrentAccount(new Date(), null));
        assertTrue(JwtFilter.belongsToCurrentAccount(null, LocalDateTime.now().minusDays(1)));
        assertTrue(JwtFilter.belongsToCurrentAccount(new Date(), LocalDateTime.now().plusHours(5)));
    }
}

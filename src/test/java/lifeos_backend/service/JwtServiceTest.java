package lifeos_backend.service;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

class JwtServiceTest {

    // Test-only value. Never use this anywhere real.
    private static final String SECRET = "test-only-secret-0123456789-abcdefghijklmnop";

    @Test
    void refusesToStartWithoutASecret() {
        assertThrows(IllegalStateException.class, () -> new JwtService(""));
        assertThrows(IllegalStateException.class, () -> new JwtService(null));
    }

    @Test
    void refusesShortSecret() {
        assertThrows(IllegalStateException.class, () -> new JwtService("too-short"));
    }

    @Test
    void tokenRoundTrip() {
        JwtService jwt = new JwtService(SECRET);
        String token = jwt.generateToken("aj@example.com");
        assertTrue(jwt.isTokenValid(token));
        assertEquals("aj@example.com", jwt.extractEmail(token));
    }

    @Test
    void tokenFromAnotherKeyIsRejected() {
        String foreign = new JwtService(SECRET + "-other").generateToken("victim@example.com");
        assertFalse(new JwtService(SECRET).isTokenValid(foreign),
                "a token signed with a different key (e.g. the old leaked one) must be invalid");
    }

    @Test
    void tamperedTokenIsRejected() {
        JwtService jwt = new JwtService(SECRET);
        String token = jwt.generateToken("aj@example.com");
        String tampered = token.substring(0, token.length() - 2) + (token.endsWith("A") ? "BB" : "AA");
        assertFalse(jwt.isTokenValid(tampered));
    }

    @Test
    void garbageIsRejected() {
        assertFalse(new JwtService(SECRET).isTokenValid("not.a.jwt"));
    }
}

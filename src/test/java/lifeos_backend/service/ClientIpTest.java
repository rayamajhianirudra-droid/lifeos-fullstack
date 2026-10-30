package lifeos_backend.service;

import org.junit.jupiter.api.Test;
import jakarta.servlet.http.HttpServletRequest;

import static org.mockito.Mockito.*;

import static org.junit.jupiter.api.Assertions.*;

class ClientIpTest {

    private static HttpServletRequest req(String xff, String trueClientIp) {
        HttpServletRequest r = mock(HttpServletRequest.class);
        when(r.getRemoteAddr()).thenReturn("10.0.0.5");
        when(r.getHeader("X-Forwarded-For")).thenReturn(xff);
        when(r.getHeader("True-Client-IP")).thenReturn(trueClientIp);
        return r;
    }

    @Test
    void railwayUsesLastForwardedEntry() {
        // A client-forged first entry must be ignored.
        assertEquals("203.0.113.9", RateLimiter.clientIp(req("6.6.6.6, 203.0.113.9", null), null));
    }

    @Test
    void renderUsesTrustedHeaderNotCloudflareEdge() {
        // Render: XFF ends with a shared Cloudflare edge IP; True-Client-IP is the user.
        var r = req("198.51.100.7, 104.22.17.40", "198.51.100.7");
        assertEquals("198.51.100.7", RateLimiter.clientIp(r, "True-Client-IP"));
    }

    @Test
    void trustedHeaderWorksForIpv6() {
        var r = req(null, "2001:db8::1");
        assertEquals("2001:db8::1", RateLimiter.clientIp(r, "True-Client-IP"));
    }

    @Test
    void invalidTrustedHeaderFallsBack() {
        var r = req("198.51.100.7, 104.22.17.40", "not-an-ip; drop table");
        assertEquals("104.22.17.40", RateLimiter.clientIp(r, "True-Client-IP"));
    }

    @Test
    void missingHeadersFallBackToRemoteAddr() {
        assertEquals("10.0.0.5", RateLimiter.clientIp(req(null, null), "True-Client-IP"));
        assertEquals("10.0.0.5", RateLimiter.clientIp(req(null, null), null));
    }

    @Test
    void looksLikeIpRejectsJunk() {
        assertTrue(RateLimiter.looksLikeIp("192.168.1.1"));
        assertTrue(RateLimiter.looksLikeIp(" ::1 "));
        assertFalse(RateLimiter.looksLikeIp(""));
        assertFalse(RateLimiter.looksLikeIp(null));
        assertFalse(RateLimiter.looksLikeIp("1.2.3.4, 5.6.7.8"));
        assertFalse(RateLimiter.looksLikeIp("a".repeat(46)));
    }
}

package lifeos_backend.service;

import org.junit.jupiter.api.Test;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;

class AdminAccessTest {

    @Test
    void unsetMeansNobodyIsAdmin() {
        assertFalse(new AdminAccess("").isAdmin("aj@example.com"));
        assertFalse(new AdminAccess(null).isAdmin("aj@example.com"));
        assertFalse(new AdminAccess("").isAdmin(null));
    }

    @Test
    void matchesListedEmailsCaseInsensitively() {
        AdminAccess a = new AdminAccess(" AJ@Example.com , second@example.com,not-an-email ");
        assertTrue(a.isAdmin("aj@example.com"));
        assertTrue(a.isAdmin("Second@Example.COM"));
        assertFalse(a.isAdmin("someone@example.com"));
        assertFalse(a.isAdmin("not-an-email"));
    }

    @Test
    void noPartialOrPrefixMatches() {
        AdminAccess a = new AdminAccess("aj@example.com");
        assertFalse(a.isAdmin("aj@example.com.evil.io"));
        assertFalse(a.isAdmin("xaj@example.com"));
    }

    @Test
    void zeroFillCoversEveryDayInOrder() {
        LocalDate from = LocalDate.of(2026, 10, 30);
        LocalDate to = LocalDate.of(2026, 11, 2);
        List<Map<String, Object>> days = AdminStatsService.zeroFill(Map.of(LocalDate.of(2026, 11, 1), 4L), from, to);
        assertEquals(4, days.size());
        assertEquals("2026-10-30", days.get(0).get("date"));
        assertEquals(0L, days.get(0).get("count"));
        assertEquals(4L, days.get(2).get("count"));
        assertEquals("2026-11-02", days.get(3).get("date"));
    }
}

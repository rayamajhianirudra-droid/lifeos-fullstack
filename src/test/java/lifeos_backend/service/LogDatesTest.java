package lifeos_backend.service;

import org.junit.jupiter.api.Test;

import java.time.LocalDate;

import static org.junit.jupiter.api.Assertions.assertEquals;

class LogDatesTest {

    private final LocalDate today = LocalDate.now();

    @Test
    void acceptsTodayYesterdayAndTomorrow() {
        assertEquals(today, LogDates.resolve(today.toString()));
        assertEquals(today.minusDays(1), LogDates.resolve(today.minusDays(1).toString()));
        // +1 day allowed: users east of UTC can already be on "tomorrow"
        assertEquals(today.plusDays(1), LogDates.resolve(today.plusDays(1).toString()));
    }

    @Test
    void acceptsLocalDateObjects() {
        assertEquals(today.minusDays(3), LogDates.resolve(today.minusDays(3)));
    }

    @Test
    void fallsBackToServerDateForMissingOrInvalidInput() {
        assertEquals(today, LogDates.resolve(null));
        assertEquals(today, LogDates.resolve(""));
        assertEquals(today, LogDates.resolve("not-a-date"));
        assertEquals(today, LogDates.resolve("2026-13-45"));
    }

    @Test
    void rejectsFarFutureAndAncientDates() {
        assertEquals(today, LogDates.resolve(today.plusDays(5).toString()));
        assertEquals(today, LogDates.resolve(today.minusYears(3).toString()));
    }
}

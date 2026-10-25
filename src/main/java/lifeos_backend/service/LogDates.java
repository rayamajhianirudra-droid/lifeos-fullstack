package lifeos_backend.service;

import java.time.LocalDate;
import java.time.format.DateTimeParseException;

/**
 * Resolves the calendar date a log entry belongs to.
 *
 * The server runs in UTC, so LocalDate.now() here is "tomorrow" for US users every
 * evening. The app therefore sends the user's LOCAL date (YYYY-MM-DD) with each log.
 * We accept it only within a sane window (up to a year back, one day ahead to cover
 * time zones east of UTC); anything missing or invalid falls back to the server date.
 */
public final class LogDates {

    private LogDates() {}

    public static LocalDate resolve(Object requested) {
        LocalDate today = LocalDate.now();
        LocalDate parsed = null;
        if (requested instanceof LocalDate d) {
            parsed = d;
        } else if (requested != null) {
            String s = requested.toString().trim();
            if (!s.isEmpty()) {
                try {
                    parsed = LocalDate.parse(s);
                } catch (DateTimeParseException ignored) {
                    // fall through to server date
                }
            }
        }
        if (parsed == null || parsed.isAfter(today.plusDays(1)) || parsed.isBefore(today.minusDays(366))) {
            return today;
        }
        return parsed;
    }
}

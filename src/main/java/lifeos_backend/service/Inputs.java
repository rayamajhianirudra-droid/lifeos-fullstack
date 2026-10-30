package lifeos_backend.service;

import java.util.Locale;
import java.util.Set;

/** Small helpers to read untrusted JSON values safely (no NumberFormatException -> 500s). */
public final class Inputs {

    private Inputs() {}

    /** A finite number within [min, max], or null. Accepts numbers or numeric strings. */
    public static Double num(Object v, double min, double max) {
        if (v == null) return null;
        try {
            double d = (v instanceof Number n) ? n.doubleValue() : Double.parseDouble(v.toString().trim());
            return (Double.isFinite(d) && d >= min && d <= max) ? d : null;
        } catch (NumberFormatException e) {
            return null;
        }
    }

    /** Trimmed text, single line, capped at max chars; "" for null. */
    public static String text(Object v, int max) {
        if (v == null) return "";
        String s = v.toString().replaceAll("[\\p{Cntrl}&&[^\\n]]", " ").trim();
        return s.length() <= max ? s : s.substring(0, max);
    }

    /** Lower-cased value if it's one of the allowed options, otherwise the fallback. */
    public static String oneOf(Object v, Set<String> allowed, String fallback) {
        if (v == null) return fallback;
        String s = v.toString().trim().toLowerCase(Locale.ROOT);
        return allowed.contains(s) ? s : fallback;
    }
}

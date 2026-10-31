package lifeos_backend.service;

/**
 * U.S. Navy circumference method (Hodgdon & Beckett), imperial form, inches:
 *   men:   %BF = 86.010 * log10(waist - neck) - 70.041 * log10(height) + 36.76
 *   women: %BF = 163.205 * log10(waist + hip - neck) - 97.684 * log10(height) - 78.387
 * Typical accuracy is about +/-3-4 percentage points versus DEXA. It's an estimate, and the
 * app labels it as one.
 */
public final class BodyFatCalculator {

    private BodyFatCalculator() {}

    /** Returns body fat % rounded to 0.1, or null when the measurements can't be valid. */
    public static Double navy(String sex, double heightIn, double waistIn, double neckIn, Double hipIn) {
        if (!in(heightIn, 48, 96) || !in(waistIn, 15, 80) || !in(neckIn, 8, 30)) return null;
        double pct;
        if ("female".equalsIgnoreCase(sex)) {
            if (hipIn == null || !in(hipIn, 20, 90)) return null;
            double x = waistIn + hipIn - neckIn;
            if (x <= 0) return null;
            pct = 163.205 * Math.log10(x) - 97.684 * Math.log10(heightIn) - 78.387;
        } else if ("male".equalsIgnoreCase(sex)) {
            double x = waistIn - neckIn;
            if (x <= 0) return null;
            pct = 86.010 * Math.log10(x) - 70.041 * Math.log10(heightIn) + 36.76;
        } else {
            return null;
        }
        if (!Double.isFinite(pct) || pct < 2 || pct > 70) return null;   // physiologically implausible
        return Math.round(pct * 10) / 10.0;
    }

    private static boolean in(double v, double min, double max) {
        return Double.isFinite(v) && v >= min && v <= max;
    }
}

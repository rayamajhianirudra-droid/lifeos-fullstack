package lifeos_backend.service;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

class BodyFatCalculatorTest {

    @Test
    void maleMatchesHandComputedNavyFormula() {
        // 5'10", waist 34, neck 15  ->  86.010*log10(19) - 70.041*log10(70) + 36.76 = 17.5
        assertEquals(17.5, BodyFatCalculator.navy("male", 70, 34, 15, null));
    }

    @Test
    void femaleMatchesHandComputedNavyFormula() {
        // 5'5", waist 30, hip 40, neck 13 -> 163.205*log10(57) - 97.684*log10(65) - 78.387 = 31.1
        assertEquals(31.1, BodyFatCalculator.navy("female", 65, 30, 13, 40.0));
    }

    @Test
    void femaleRequiresHip() {
        assertNull(BodyFatCalculator.navy("female", 65, 30, 13, null));
    }

    @Test
    void rejectsImpossibleMeasurements() {
        assertNull(BodyFatCalculator.navy("male", 70, 15, 15, null));   // waist == neck
        assertNull(BodyFatCalculator.navy("male", 70, 200, 15, null));  // waist out of range
        assertNull(BodyFatCalculator.navy("male", 20, 34, 15, null));   // height out of range
        assertNull(BodyFatCalculator.navy("robot", 70, 34, 15, null));
    }
}

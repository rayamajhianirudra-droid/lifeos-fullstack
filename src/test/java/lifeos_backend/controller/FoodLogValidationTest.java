package lifeos_backend.controller;

import lifeos_backend.model.FoodLog;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

class FoodLogValidationTest {

    private static FoodLog ok() {
        FoodLog f = new FoodLog();
        f.setFoodName("Banana"); f.setCalories(105); f.setProtein(1.3); f.setCarbs(27); f.setFat(0.4); f.setMealType("snack");
        return f;
    }

    @Test
    void acceptsNormalFood() {
        assertNull(FoodLogController.validate(ok()));
    }

    @Test
    void rejectsNegativeHugeOrNonFiniteValues() {
        FoodLog f = ok(); f.setCalories(-50); assertEquals("calories", FoodLogController.validate(f));
        f = ok(); f.setCalories(1e9); assertEquals("calories", FoodLogController.validate(f));
        f = ok(); f.setProtein(Double.NaN); assertEquals("macros", FoodLogController.validate(f));
    }

    @Test
    void rejectsMissingNameAndUnknownMeal() {
        FoodLog f = ok(); f.setFoodName("  "); assertEquals("name", FoodLogController.validate(f));
        f = ok(); f.setMealType("brunch"); assertEquals("mealType", FoodLogController.validate(f));
    }

    @Test
    void checksPortionFields() {
        FoodLog f = ok(); f.setQuantity(0.0); assertEquals("quantity", FoodLogController.validate(f));
        f = ok(); f.setQuantity(1.5); f.setGrams(177.0); f.setServingLabel("1 cup (118 g)");
        assertNull(FoodLogController.validate(f));
    }
}

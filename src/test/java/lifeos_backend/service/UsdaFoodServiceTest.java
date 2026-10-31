package lifeos_backend.service;

import org.junit.jupiter.api.Test;
import org.springframework.http.HttpHeaders;
import org.springframework.web.reactive.function.client.WebClientResponseException;
import java.nio.charset.StandardCharsets;

import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;

class UsdaFoodServiceTest {

    private static Map<String, Object> n(String number, String unit, double value) {
        return Map.of("nutrientNumber", number, "unitName", unit, "value", value, "nutrientName", "x");
    }

    @Test
    @SuppressWarnings("unchecked")
    void picksKcalNotKjAndBuildsBrandedServing() {
        Map<String, Object> food = Map.of(
                "fdcId", 123,
                "description", "BIG MAC",
                "brandOwner", "McDonald's Corporation",
                "dataType", "Branded",
                "servingSize", 219.0, "servingSizeUnit", "g",
                "householdServingFullText", "1 sandwich",
                "foodNutrients", List.of(
                        n("268", "kJ", 1075),           // kJ listed FIRST: the old code used this as "calories"
                        n("208", "KCAL", 257),
                        n("203", "G", 11.9), n("205", "G", 20.1), n("204", "G", 15.1)));
        Map<String, Object> out = UsdaFoodService.normalize(food);
        assertNotNull(out);
        Map<String, Object> per100 = (Map<String, Object>) out.get("per100g");
        assertEquals(257.0, per100.get("calories"));
        assertEquals(11.9, per100.get("protein"));
        assertEquals("Big Mac", out.get("name"));
        List<Map<String, Object>> portions = (List<Map<String, Object>>) out.get("portions");
        assertEquals("1 sandwich (219 g)", portions.get(0).get("label"));
        assertEquals(219.0, portions.get(0).get("grams"));
        assertEquals("100 g", portions.get(portions.size() - 1).get("label"));
    }

    @Test
    @SuppressWarnings("unchecked")
    void convertsKjWhenNoKcalAndUsesSurveyMeasures() {
        Map<String, Object> food = Map.of(
                "fdcId", 456,
                "description", "Banana, raw",
                "dataType", "Survey (FNDDS)",
                "foodMeasures", List.of(
                        Map.of("disseminationText", "1 medium (7\" to 7-7/8\" long)", "gramWeight", 118),
                        Map.of("disseminationText", "Quantity not specified", "gramWeight", 118)),
                "foodNutrients", List.of(n("268", "KJ", 372.4), n("203", "G", 1.1)));
        Map<String, Object> out = UsdaFoodService.normalize(food);
        Map<String, Object> per100 = (Map<String, Object>) out.get("per100g");
        assertEquals(89.0, per100.get("calories"));               // 372.4 kJ / 4.184
        List<Map<String, Object>> portions = (List<Map<String, Object>>) out.get("portions");
        assertTrue(portions.get(0).get("label").toString().startsWith("1 medium"));
        assertEquals(2, portions.size(), "'Quantity not specified' is dropped, 100 g is added");
        assertEquals("Banana, raw", out.get("name"), "mixed-case names are kept as-is");
    }

    @Test
    void dropsFoodsWithNoEnergyOrImpossibleEnergy() {
        assertNull(UsdaFoodService.normalize(Map.of("description", "Mystery", "foodNutrients", List.of(n("203", "G", 5)))));
        assertNull(UsdaFoodService.normalize(Map.of("description", "Bad data", "foodNutrients", List.of(n("208", "KCAL", 4000)))));
    }

    @Test
    void extractsUsdaErrorCodeForLogsWithoutLeakingTheKey() {
        String body = "{\n  \"error\": {\n    \"code\": \"API_KEY_INVALID\",\n    \"message\": \"An invalid api_key was supplied.\"\n  }\n}";
        var e = WebClientResponseException.create(403, "Forbidden", HttpHeaders.EMPTY,
                body.getBytes(StandardCharsets.UTF_8), StandardCharsets.UTF_8);
        assertEquals("API_KEY_INVALID", UsdaFoodService.usdaErrorCode(e));
        var html = WebClientResponseException.create(400, "Bad Request", HttpHeaders.EMPTY,
                "<html>400</html>".getBytes(StandardCharsets.UTF_8), StandardCharsets.UTF_8);
        assertEquals("", UsdaFoodService.usdaErrorCode(html));
    }

    @Test
    void searchesAllFourUsdaDataTypes() {
        assertEquals(List.of("Survey (FNDDS)", "Foundation", "SR Legacy", "Branded"), UsdaFoodService.DATA_TYPES);
    }
}

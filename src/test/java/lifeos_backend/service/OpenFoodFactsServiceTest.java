package lifeos_backend.service;

import org.junit.jupiter.api.Test;

import java.util.*;

import static org.junit.jupiter.api.Assertions.*;

class OpenFoodFactsServiceTest {

    private static Map<String, Object> product(Object name, Map<String, Object> nutriments) {
        Map<String, Object> p = new HashMap<>();
        p.put("code", "8901058851137");
        p.put("product_name", name);
        p.put("brands", "Maggi, Nestlé");
        p.put("nutriments", nutriments);
        p.put("serving_quantity", 70);
        p.put("serving_size", "70 g");
        return p;
    }

    @Test
    @SuppressWarnings("unchecked")
    void mapsAProductToTheAppsFoodShape() {
        Map<String, Object> f = OpenFoodFactsService.normalize(product("Masala Noodles",
                Map.of("energy-kcal_100g", 427, "proteins_100g", 8.9, "carbohydrates_100g", 60.2, "fat_100g", 16.7)));
        assertNotNull(f);
        assertEquals("Masala Noodles", f.get("name"));
        assertEquals("Maggi", f.get("brand"));
        assertEquals("off:8901058851137", f.get("id"));
        assertEquals("8901058851137", f.get("upc"));
        assertEquals("openfoodfacts", f.get("source"));
        Map<String, Object> per = (Map<String, Object>) f.get("per100g");
        assertEquals(427.0, per.get("calories"));
        assertEquals(8.9, per.get("protein"));
        List<Map<String, Object>> portions = (List<Map<String, Object>>) f.get("portions");
        assertEquals("1 serving (70 g)", portions.get(0).get("label"));
        assertEquals(70.0, portions.get(0).get("grams"));
        assertEquals("100 g", portions.get(portions.size() - 1).get("label"));
    }

    @Test
    @SuppressWarnings("unchecked")
    void convertsKilojoulesWhenKcalIsMissing() {
        Map<String, Object> f = OpenFoodFactsService.normalize(product("Vegemite", Map.of("energy_100g", "1000")));
        assertEquals(239.0, ((Map<String, Object>) f.get("per100g")).get("calories"));
    }

    @Test
    void skipsProductsWithoutANameOrRealCalories() {
        assertNull(OpenFoodFactsService.normalize(product(null, Map.of("energy-kcal_100g", 100))));
        assertNull(OpenFoodFactsService.normalize(product("  ", Map.of("energy-kcal_100g", 100))));
        assertNull(OpenFoodFactsService.normalize(product("Mystery", Map.of())));
        assertNull(OpenFoodFactsService.normalize(product("Typo", Map.of("energy-kcal_100g", 4000))));
    }

    @Test
    void cleansTextAndClampsNumbers() {
        Map<String, Object> f = OpenFoodFactsService.normalize(product("Chips\n<b>Salted</b>\u0000",
                Map.of("energy-kcal_100g", 530, "fat_100g", -3, "proteins_100g", 400)));
        assertFalse(f.get("name").toString().contains("\n"));
        assertFalse(f.get("name").toString().contains("\u0000"));
        @SuppressWarnings("unchecked") Map<String, Object> per = (Map<String, Object>) f.get("per100g");
        assertEquals(0.0, per.get("fat"));
        assertEquals(100.0, per.get("protein"));
    }

    @Test
    void validatesBarcodes() {
        assertEquals("0044000032029", OpenFoodFactsService.normalizeBarcode("044000032029"));
        assertEquals("8901058851137", OpenFoodFactsService.normalizeBarcode("8901058851137"));
        assertNull(OpenFoodFactsService.normalizeBarcode("1234"));
        assertNull(OpenFoodFactsService.normalizeBarcode("../../etc"));
        assertNull(OpenFoodFactsService.normalizeBarcode("00000000"));
    }

    @Test
    void busyMarkerIsNotAnOrdinaryEmptyList() {
        assertNotSame(List.of(), OpenFoodFactsService.BUSY);
    }
}

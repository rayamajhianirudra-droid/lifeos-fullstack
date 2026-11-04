package lifeos_backend.service;

import lifeos_backend.model.FoodImage;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;

class FoodImageServiceTest {

    @Test
    void simplifiesUsdaNamesToWhatTheFoodLooksLike() {
        assertEquals("chicken breast", FoodImageService.term("Chicken, broiler or fryers, breast, meat only, cooked, roasted"));
        assertEquals("bananas", FoodImageService.term("Bananas, raw"));
        assertEquals("rice white", FoodImageService.term("Rice, white, cooked, NFS"));
        assertEquals("egg scrambled", FoodImageService.term("Egg, whole, cooked, scrambled"));
        assertEquals("big mac", FoodImageService.term("Big Mac"));
    }

    @Test
    void dropsBrandInBracketsAndOddCharacters() {
        assertEquals("oreo cookies", FoodImageService.term("Oreo Cookies (Nabisco)"));
        assertEquals("greek yogurt", FoodImageService.term("Greek Yogurt, 2% (Fage) <b>"));
        assertEquals("mcdonald", FoodImageService.term("McDonald's"));
    }

    @Test
    void returnsNullWhenNothingDescriptiveIsLeft() {
        assertNull(FoodImageService.term(null));
        assertNull(FoodImageService.term("Raw, cooked, NFS"));
        assertNull(FoodImageService.term("100%"));
    }

    @Test
    void keepsTermsShort() {
        String t = FoodImageService.term("Supercalifragilisticexpialidocious extraordinarily magnificent wonderful pie");
        assertTrue(t.length() <= 40);
        assertTrue(t.split(" ").length <= 3);
    }

    @Test
    void normalizesBarcodes() {
        assertEquals("0044000032029", FoodImageService.normalizeUpc("044000032029")); // 12-digit UPC-A
        assertEquals("3274080005003", FoodImageService.normalizeUpc(" 3274080005003 "));
        assertNull(FoodImageService.normalizeUpc("12345"));
        assertNull(FoodImageService.normalizeUpc("00000000000000"));
        assertNull(FoodImageService.normalizeUpc("04400003202x"));
        assertNull(FoodImageService.normalizeUpc("../../etc/passwd"));
    }

    @Test
    void onlyReturnsHttpsImagesFromTheKnownHosts() {
        assertTrue(FoodImageService.isAllowedImageUrl("https://images.pexels.com/photos/1/pexels-photo-1.jpeg?h=200"));
        assertTrue(FoodImageService.isAllowedImageUrl("https://images.openfoodfacts.org/images/products/1/front_en.3.200.jpg"));
        assertFalse(FoodImageService.isAllowedImageUrl("http://images.pexels.com/photos/1.jpg"));
        assertFalse(FoodImageService.isAllowedImageUrl("https://images.pexels.com.evil.example/x.jpg"));
        assertFalse(FoodImageService.isAllowedImageUrl("javascript:alert(1)"));
        assertFalse(FoodImageService.isAllowedImageUrl("https://images.pexels.com/x.jpg\" onerror=\"x"));
        assertFalse(FoodImageService.isAllowedImageUrl(null));
    }

    @Test
    void looksUpBarcodeFirstThenNameOnlyAfterABarcodeMiss() {
        List<String> keys = List.of("upc:0044000032029", "oreo cookies");
        assertEquals("upc:0044000032029", FoodImageService.nextKeyToLookUp(keys, Map.of()));

        FoodImage upcMiss = new FoodImage("upc:0044000032029", null, null, null, "openfoodfacts", false);
        assertEquals("oreo cookies", FoodImageService.nextKeyToLookUp(keys, Map.of("upc:0044000032029", upcMiss)));

        FoodImage upcHit = new FoodImage("upc:0044000032029", "https://images.openfoodfacts.org/a.jpg",
                "Open Food Facts", "https://world.openfoodfacts.org/product/0044000032029", "openfoodfacts", true);
        assertNull(FoodImageService.nextKeyToLookUp(keys, Map.of("upc:0044000032029", upcHit)));

        FoodImage nameMiss = new FoodImage("oreo cookies", null, null, null, "pexels", false);
        assertNull(FoodImageService.nextKeyToLookUp(keys, Map.of("upc:0044000032029", upcMiss, "oreo cookies", nameMiss)));
    }
}

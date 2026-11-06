package lifeos_backend.service;

import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import org.junit.jupiter.api.Test;

import java.io.File;
import java.net.URL;
import java.util.*;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Guards account deletion and export: every entity that stores a user's rows must be
 * covered, so a new table can never be left behind when someone deletes their account.
 */
class AccountServiceTest {

    /** Entities handled outside USER_TABLES, and why. */
    private static final Map<String, String> HANDLED_ELSEWHERE = Map.of(
            "users", "the account row itself, deleted last",
            "plan_exercises", "deleted through workout_plans",
            "password_reset_tokens", "deleted by email",
            "food_images", "shared photo cache, holds no user data");

    @Test
    void everyEntityIsCoveredByDeletionAndExport() throws Exception {
        List<Class<?>> entities = entityClasses();
        assertTrue(entities.size() >= 15, "found only " + entities.size() + " entities");
        for (Class<?> c : entities) {
            String table = c.getAnnotation(Table.class).name();
            boolean hasUserId = Arrays.stream(c.getDeclaredFields()).anyMatch(f -> f.getName().equals("userId"));
            if (HANDLED_ELSEWHERE.containsKey(table)) {
                assertFalse(hasUserId && !table.equals("users"), table + " has userId: add it to USER_TABLES");
                continue;
            }
            assertTrue(hasUserId, c.getSimpleName() + " has no userId: decide how account deletion handles it");
            assertTrue(AccountService.USER_TABLES.contains(table),
                    c.getSimpleName() + " (" + table + ") is not deleted or exported: add it to AccountService.USER_TABLES");
        }
    }

    @Test
    void tableNamesAreFixedIdentifiers() {
        for (String t : AccountService.USER_TABLES) assertTrue(t.matches("[a-z_]+"), t);
    }

    private static List<Class<?>> entityClasses() throws Exception {
        URL url = AccountServiceTest.class.getClassLoader().getResource("lifeos_backend/model");
        assertNotNull(url);
        List<Class<?>> out = new ArrayList<>();
        for (File f : Objects.requireNonNull(new File(url.toURI()).listFiles())) {
            if (!f.getName().endsWith(".class") || f.getName().contains("$")) continue;
            Class<?> c = Class.forName("lifeos_backend.model." + f.getName().replace(".class", ""));
            if (c.isAnnotationPresent(Entity.class)) out.add(c);
        }
        return out;
    }
}

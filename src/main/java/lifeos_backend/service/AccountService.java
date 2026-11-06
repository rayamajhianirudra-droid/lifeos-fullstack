package lifeos_backend.service;

import lifeos_backend.model.User;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.*;

/**
 * Data export and account deletion (App Store guideline 5.1.1(v), GDPR/CCPA style rights).
 *
 * USER_TABLES lists every table that holds rows owned by one user through a user_id
 * column. AccountServiceTest fails the build if a new entity with a userId field is
 * added and not listed here, so deletion and export can never silently miss data.
 *
 * Table names are constants (never user input), so building SQL with them is safe;
 * all values go through bind parameters.
 */
@Service
public class AccountService {

    private static final Logger log = LoggerFactory.getLogger(AccountService.class);

    /** Tables with a user_id column, in export order. */
    static final List<String> USER_TABLES = List.of(
            "food_logs", "custom_foods", "exercise_logs", "water_logs", "weight_logs", "body_fat_logs",
            "sleep_logs", "mood_logs", "supplement_logs", "workout_plans", "notification_logs",
            "push_subscriptions");

    /** Columns never exported: internal links, and secrets of the browser push channel. */
    private static final Set<String> HIDDEN_COLUMNS = Set.of("user_id", "workout_plan_id", "endpoint", "p256dh", "auth");

    private final JdbcTemplate jdbc;

    public AccountService(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    /** Everything we store about the user, as plain JSON-friendly maps. Never includes the password hash. */
    @Transactional(readOnly = true)
    public Map<String, Object> export(User u) {
        Map<String, Object> out = new LinkedHashMap<>();
        out.put("exportedAt", Instant.now().toString());
        out.put("app", "LifeOS Health (www.lifeoshealth.com)");

        Map<String, Object> profile = new LinkedHashMap<>();
        profile.put("name", u.getName());
        profile.put("email", u.getEmail());
        profile.put("age", u.getAge());
        profile.put("weightLbs", u.getWeightLbs());
        profile.put("heightFeet", u.getHeightFeet());
        profile.put("heightInches", u.getHeightInches());
        profile.put("goal", u.getGoal());
        profile.put("activity", u.getActivity());
        profile.put("sex", u.getSex());
        profile.put("createdAt", u.getCreatedAt() == null ? null : u.getCreatedAt().toString());
        out.put("profile", profile);

        for (String table : USER_TABLES) {
            List<Map<String, Object>> rows = jdbc.queryForList(
                    "SELECT * FROM " + table + " WHERE user_id = ? ORDER BY id", u.getId());
            out.put(table, clean(rows));
        }
        out.put("plan_exercises", clean(jdbc.queryForList(
                "SELECT pe.*, pe.workout_plan_id AS plan_id FROM plan_exercises pe " +
                "JOIN workout_plans wp ON wp.id = pe.workout_plan_id WHERE wp.user_id = ? ORDER BY pe.id", u.getId())));
        return out;
    }

    /** Deletes the user and every row they own, in one transaction: all or nothing. */
    @Transactional
    public Map<String, Integer> delete(User u) {
        Map<String, Integer> counts = new LinkedHashMap<>();
        counts.put("plan_exercises", jdbc.update(
                "DELETE FROM plan_exercises WHERE workout_plan_id IN (SELECT id FROM workout_plans WHERE user_id = ?)",
                u.getId()));
        for (String table : USER_TABLES) {
            counts.put(table, jdbc.update("DELETE FROM " + table + " WHERE user_id = ?", u.getId()));
        }
        counts.put("password_reset_tokens", jdbc.update(
                "DELETE FROM password_reset_tokens WHERE lower(email) = lower(?)", u.getEmail()));
        counts.put("users", jdbc.update("DELETE FROM users WHERE id = ?", u.getId()));
        // Id and row counts only: no email or name in the logs.
        log.info("ACCOUNT DELETED user id={} rows={}", u.getId(), counts);
        return counts;
    }

    private static List<Map<String, Object>> clean(List<Map<String, Object>> rows) {
        List<Map<String, Object>> out = new ArrayList<>(rows.size());
        for (Map<String, Object> r : rows) {
            Map<String, Object> m = new LinkedHashMap<>();
            r.forEach((k, v) -> {
                if (HIDDEN_COLUMNS.contains(k.toLowerCase(Locale.ROOT))) return;
                m.put(k, v == null || v instanceof Number || v instanceof Boolean ? v : v.toString());
            });
            out.add(m);
        }
        return out;
    }
}

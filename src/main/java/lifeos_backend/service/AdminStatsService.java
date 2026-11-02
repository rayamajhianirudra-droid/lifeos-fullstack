package lifeos_backend.service;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

import java.lang.management.ManagementFactory;
import java.time.Duration;
import java.time.LocalDate;
import java.util.*;

/**
 * Aggregate numbers for the admin dashboard. Privacy rules:
 *  - only counts and totals; never names, emails, ids or one person's logs
 *  - a food appears in "popular foods" only if at least MIN_USERS_PER_FOOD
 *    different people logged it, so a rare entry can't point to one user
 * All queries are fixed SQL with no user input, so there is nothing to inject.
 */
@Service
public class AdminStatsService {

    static final int MIN_USERS_PER_FOOD = 3;
    static final int DAYS = 30;
    /** Neon free plan storage; shown so it's obvious when an upgrade is due. */
    static final long FREE_DB_BYTES = 512L * 1024 * 1024;

    /** Every table that holds a user's dated activity (fixed list, not user input). */
    static final List<String> ACTIVITY_TABLES = List.of(
            "food_logs", "water_logs", "weight_logs", "exercise_logs",
            "sleep_logs", "mood_logs", "supplement_logs", "body_fat_logs");

    private final JdbcTemplate jdbc;
    private final UsageCounters counters;

    public AdminStatsService(JdbcTemplate jdbc, UsageCounters counters) {
        this.jdbc = jdbc;
        this.counters = counters;
    }

    public Map<String, Object> stats() {
        LocalDate today = LocalDate.now();
        LocalDate from = today.minusDays(DAYS - 1);
        Map<String, Object> out = new LinkedHashMap<>();
        out.put("generatedAt", new Date().toInstant().toString());

        // Users
        Map<String, Object> users = new LinkedHashMap<>();
        users.put("total", count("select count(*) from users"));
        users.put("newLast7Days", count("select count(*) from users where created_at >= now() - interval '7 days'"));
        users.put("newLast30Days", count("select count(*) from users where created_at >= now() - interval '30 days'"));
        String anyActivity = String.join(" union ",
                ACTIVITY_TABLES.stream().map(t -> "select user_id, date from " + t).toList());
        users.put("activeToday", count("select count(distinct user_id) from (" + anyActivity + ") a where date = current_date"));
        users.put("activeLast7Days", count("select count(distinct user_id) from (" + anyActivity + ") a where date >= current_date - 6"));
        users.put("activeLast30Days", count("select count(distinct user_id) from (" + anyActivity + ") a where date >= current_date - 29"));
        out.put("users", users);

        // Sign-ups per day (last 30 days, zero-filled)
        out.put("signupsByDay", byDay(
                "select cast(created_at as date) d, count(*) n from users where created_at >= current_date - 29 group by 1",
                from, today));

        // Logs per day for each type, plus all-time totals
        Map<String, Object> logs = new LinkedHashMap<>();
        Map<String, Long> totals = new LinkedHashMap<>();
        for (String t : ACTIVITY_TABLES) {
            logs.put(t, byDay("select date d, count(*) n from " + t + " where date >= current_date - 29 group by 1", from, today));
            totals.put(t, count("select count(*) from " + t));
        }
        out.put("logsByDay", logs);
        out.put("logTotals", totals);

        // Popular foods, only when enough different people logged them
        out.put("popularFoods", jdbc.query(
                "select lower(trim(food_name)) f, count(*) n, count(distinct user_id) u from food_logs "
                        + "where food_name is not null group by 1 having count(distinct user_id) >= ? "
                        + "order by n desc limit 10",
                (rs, i) -> Map.of("food", rs.getString("f"), "logs", rs.getLong("n"), "people", rs.getLong("u")),
                MIN_USERS_PER_FOOD));
        out.put("popularFoodsMinPeople", MIN_USERS_PER_FOOD);

        // Usage since the server last started (in memory, resets on restart)
        Map<String, Object> usage = new LinkedHashMap<>();
        usage.put("since", counters.since().toString());
        usage.put("foodSearches", counters.foodSearches());
        usage.put("foodSearchFailures", counters.foodSearchFailures());
        usage.put("coachMessages", counters.coachMessages());
        usage.put("coachFallbacks", counters.coachFallbacks());
        out.put("usageSinceRestart", usage);

        // Database and server health
        Map<String, Object> system = new LinkedHashMap<>();
        Long dbBytes = jdbc.queryForObject("select pg_database_size(current_database())", Long.class);
        system.put("databaseBytes", dbBytes);
        system.put("databaseFreeLimitBytes", FREE_DB_BYTES);
        Runtime rt = Runtime.getRuntime();
        system.put("heapUsedBytes", rt.totalMemory() - rt.freeMemory());
        system.put("heapMaxBytes", rt.maxMemory());
        system.put("uptimeSeconds", Duration.ofMillis(ManagementFactory.getRuntimeMXBean().getUptime()).toSeconds());
        system.put("javaVersion", System.getProperty("java.version"));
        out.put("system", system);
        return out;
    }

    private long count(String sql) {
        Long n = jdbc.queryForObject(sql, Long.class);
        return n == null ? 0 : n;
    }

    /** Runs a (d, n) query and returns one {date, count} entry for every day in range. */
    private List<Map<String, Object>> byDay(String sql, LocalDate from, LocalDate to) {
        Map<LocalDate, Long> found = new HashMap<>();
        jdbc.query(sql, rs -> {
            java.sql.Date d = rs.getDate("d");
            if (d != null) found.put(d.toLocalDate(), rs.getLong("n"));
        });
        return zeroFill(found, from, to);
    }

    static List<Map<String, Object>> zeroFill(Map<LocalDate, Long> found, LocalDate from, LocalDate to) {
        List<Map<String, Object>> days = new ArrayList<>();
        for (LocalDate d = from; !d.isAfter(to); d = d.plusDays(1)) {
            days.add(Map.of("date", d.toString(), "count", found.getOrDefault(d, 0L)));
        }
        return days;
    }
}

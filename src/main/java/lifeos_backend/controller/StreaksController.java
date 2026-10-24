package lifeos_backend.controller;

import lifeos_backend.repository.WaterRepository;
import lifeos_backend.repository.WeightRepository;
import lifeos_backend.service.JwtService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import javax.sql.DataSource;
import java.sql.*;
import java.time.LocalDate;
import java.util.*;

@RestController
@RequestMapping("/api/streaks")
@CrossOrigin(origins = "*")
public class StreaksController {

    @Autowired private JwtService jwtService;
    @Autowired private DataSource dataSource;

    private Long getUserId(String auth) {
        return jwtService.extractUserId(auth.replace("Bearer ", ""));
    }

    /** Compute streak from a sorted (desc) list of dates */
    private int computeStreak(List<LocalDate> dates) {
        if (dates.isEmpty()) return 0;
        int streak = 0;
        LocalDate expected = LocalDate.now();
        for (LocalDate d : dates) {
            if (d.equals(expected)) {
                streak++;
                expected = expected.minusDays(1);
            } else if (d.isBefore(expected)) {
                break;
            }
        }
        return streak;
    }

    /** Get distinct dates for a given table, desc order */
    private List<LocalDate> getDates(Connection conn, String table, long userId) throws SQLException {
        String sql = "SELECT DISTINCT date FROM " + table + " WHERE user_id = ? ORDER BY date DESC";
        List<LocalDate> dates = new ArrayList<>();
        try (PreparedStatement ps = conn.prepareStatement(sql)) {
            ps.setLong(1, userId);
            ResultSet rs = ps.executeQuery();
            while (rs.next()) dates.add(rs.getDate(1).toLocalDate());
        }
        return dates;
    }

    /** Get all logged dates for calendar heatmap (food + exercise) for last 90 days */
    private List<String> getHeatmapDates(Connection conn, long userId) throws SQLException {
        LocalDate cutoff = LocalDate.now().minusDays(90);
        String sql = "SELECT DISTINCT date FROM food_logs WHERE user_id = ? AND date >= ? " +
                     "UNION SELECT DISTINCT date FROM exercise_logs WHERE user_id = ? AND date >= ? " +
                     "ORDER BY date ASC";
        List<String> dates = new ArrayList<>();
        try (PreparedStatement ps = conn.prepareStatement(sql)) {
            ps.setLong(1, userId);
            ps.setDate(2, Date.valueOf(cutoff));
            ps.setLong(3, userId);
            ps.setDate(4, Date.valueOf(cutoff));
            ResultSet rs = ps.executeQuery();
            while (rs.next()) dates.add(rs.getDate(1).toLocalDate().toString());
        }
        return dates;
    }

    @GetMapping
    public ResponseEntity<Map<String, Object>> getAll(@RequestHeader("Authorization") String auth) {
        long userId = getUserId(auth);
        Map<String, Object> result = new HashMap<>();
        try (Connection conn = dataSource.getConnection()) {
            List<LocalDate> foodDates   = getDates(conn, "food_logs",     userId);
            List<LocalDate> exDates     = getDates(conn, "exercise_logs", userId);
            List<LocalDate> waterDates  = getDates(conn, "water_logs",    userId);
            List<LocalDate> weightDates = getDates(conn, "weight_logs",   userId);

            result.put("foodStreak",     computeStreak(foodDates));
            result.put("exerciseStreak", computeStreak(exDates));
            result.put("waterStreak",    computeStreak(waterDates));
            result.put("weightStreak",   computeStreak(weightDates));
            result.put("totalFoodDays",  foodDates.size());
            result.put("totalExDays",    exDates.size());
            result.put("heatmap",        getHeatmapDates(conn, userId));
            result.put("today",          LocalDate.now().toString());
        } catch (SQLException e) {
            return ResponseEntity.internalServerError().body(Map.of("error", e.getMessage()));
        }
        return ResponseEntity.ok(result);
    }
}

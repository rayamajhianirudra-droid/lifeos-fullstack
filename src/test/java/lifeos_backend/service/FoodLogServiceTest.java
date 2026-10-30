package lifeos_backend.service;

import lifeos_backend.model.FoodLog;
import lifeos_backend.repository.FoodLogRepository;
import org.junit.jupiter.api.Test;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class FoodLogServiceTest {

    private final FoodLogRepository repo = mock(FoodLogRepository.class);
    private final FoodLogService service = new FoodLogService(repo, mock(AiInsightService.class));
    private final LocalDate today = LocalDate.of(2026, 10, 27);

    @Test
    void streakStaysAliveBeforeTodaysFirstLog() {
        // Logged the 3 previous days, nothing yet today: still a 3-day streak (used to show 0).
        when(repo.findDistinctDatesByUserId(1L)).thenReturn(List.of(today.minusDays(1), today.minusDays(2), today.minusDays(3)));
        assertEquals(3, service.getStreakForUser(1L, today));
    }

    @Test
    void streakCountsTodayAndBreaksOnGap() {
        when(repo.findDistinctDatesByUserId(1L)).thenReturn(List.of(today, today.minusDays(1), today.minusDays(3)));
        assertEquals(2, service.getStreakForUser(1L, today));
    }

    @Test
    void streakIsZeroAfterAMissedDay() {
        when(repo.findDistinctDatesByUserId(1L)).thenReturn(List.of(today.minusDays(2)));
        assertEquals(0, service.getStreakForUser(1L, today));
    }

    @Test
    void historyHasEveryDayWithNullsForGaps() {
        FoodLog a = new FoodLog(); a.setDate(today); a.setCalories(500); a.setProtein(30); a.setCarbs(50); a.setFat(10); a.setMealType("lunch");
        FoodLog b = new FoodLog(); b.setDate(today); b.setCalories(300.4); b.setProtein(10); b.setCarbs(20); b.setFat(5); b.setMealType("dinner");
        when(repo.findByUserIdAndDateBetweenOrderByDateAsc(eq(1L), any(), any())).thenReturn(List.of(a, b));
        List<Map<String, Object>> h = service.history(1L, today, 7);
        assertEquals(7, h.size());
        assertEquals(today.minusDays(6).toString(), h.get(0).get("date"));
        assertNull(h.get(0).get("calories"), "unlogged day is a gap, not 0");
        Map<String, Object> last = h.get(6);
        assertEquals(800L, last.get("calories"));
        assertEquals(40.0, last.get("protein"));
        assertEquals(2, last.get("items"));
        assertEquals(2L, last.get("meals"));
        assertEquals("Oct 27", last.get("day"));
    }
}

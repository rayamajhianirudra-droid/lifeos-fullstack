package lifeos_backend.model;

import jakarta.persistence.*;
import java.time.LocalDate;

@Entity
@Table(name = "water_logs")
public class WaterLog {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    private Long userId;
    private double amountOz;
    private LocalDate date;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public Long getUserId() { return userId; }
    public void setUserId(Long userId) { this.userId = userId; }
    public double getAmountOz() { return amountOz; }
    public void setAmountOz(double amountOz) { this.amountOz = amountOz; }
    public LocalDate getDate() { return date; }
    public void setDate(LocalDate date) { this.date = date; }
}

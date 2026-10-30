package lifeos_backend.model;

import jakarta.persistence.*;
import java.time.LocalDate;

@Entity
@Table(name = "body_fat_logs")
public class BodyFatLog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private Long userId;
    private double bodyFatPercent;
    private String sex;
    private double heightInches;
    private double waistInches;
    private double neckInches;
    private Double hipInches;   // women only
    private LocalDate date;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public Long getUserId() { return userId; }
    public void setUserId(Long userId) { this.userId = userId; }
    public double getBodyFatPercent() { return bodyFatPercent; }
    public void setBodyFatPercent(double bodyFatPercent) { this.bodyFatPercent = bodyFatPercent; }
    public String getSex() { return sex; }
    public void setSex(String sex) { this.sex = sex; }
    public double getHeightInches() { return heightInches; }
    public void setHeightInches(double heightInches) { this.heightInches = heightInches; }
    public double getWaistInches() { return waistInches; }
    public void setWaistInches(double waistInches) { this.waistInches = waistInches; }
    public double getNeckInches() { return neckInches; }
    public void setNeckInches(double neckInches) { this.neckInches = neckInches; }
    public Double getHipInches() { return hipInches; }
    public void setHipInches(Double hipInches) { this.hipInches = hipInches; }
    public LocalDate getDate() { return date; }
    public void setDate(LocalDate date) { this.date = date; }
}

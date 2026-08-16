package com.lifeos.lifeos_backend.model;

import jakarta.persistence.*;
import java.time.LocalDate;

@Entity
@Table(name = "weight_logs")
public class WeightEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private Long userId;
    private double weightLbs;
    private LocalDate date = LocalDate.now();

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public Long getUserId() { return userId; }
    public void setUserId(Long userId) { this.userId = userId; }

    public double getWeightLbs() { return weightLbs; }
    public void setWeightLbs(double weightLbs) { this.weightLbs = weightLbs; }

    public LocalDate getDate() { return date; }
    public void setDate(LocalDate date) { this.date = date; }
}
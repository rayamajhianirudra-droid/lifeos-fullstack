package com.lifeos.lifeos_backend.model;

import jakarta.persistence.*;
import java.time.LocalDate;

@Entity
@Table(name = "food_logs")
public class FoodLog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private Long userId;
    private String foodName;
    private double calories;
    private double protein;
    private double carbs;
    private double fat;
    private LocalDate date = LocalDate.now();
    private String insight;
    private String mealType = "snack";

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public Long getUserId() { return userId; }
    public void setUserId(Long userId) { this.userId = userId; }
    public String getFoodName() { return foodName; }
    public void setFoodName(String foodName) { this.foodName = foodName; }
    public double getCalories() { return calories; }
    public void setCalories(double calories) { this.calories = calories; }
    public double getProtein() { return protein; }
    public void setProtein(double protein) { this.protein = protein; }
    public double getCarbs() { return carbs; }
    public void setCarbs(double carbs) { this.carbs = carbs; }
    public double getFat() { return fat; }
    public void setFat(double fat) { this.fat = fat; }
    public LocalDate getDate() { return date; }
    public void setDate(LocalDate date) { this.date = date; }
    public String getInsight() { return insight; }
    public void setInsight(String insight) { this.insight = insight; }
    public String getMealType() { return mealType; }
    public void setMealType(String mealType) { this.mealType = mealType; }
}
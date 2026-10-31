package lifeos_backend.model;

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

    // Portion details (nullable: older rows don't have them)
    private Long fdcId;           // USDA food id, if logged from search
    private String servingLabel;  // e.g. "1 sandwich (219 g)"
    private Double quantity;      // how many of servingLabel
    private Double grams;         // total grams eaten, if known

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
    public Long getFdcId() { return fdcId; }
    public void setFdcId(Long fdcId) { this.fdcId = fdcId; }
    public String getServingLabel() { return servingLabel; }
    public void setServingLabel(String servingLabel) { this.servingLabel = servingLabel; }
    public Double getQuantity() { return quantity; }
    public void setQuantity(Double quantity) { this.quantity = quantity; }
    public Double getGrams() { return grams; }
    public void setGrams(Double grams) { this.grams = grams; }
}

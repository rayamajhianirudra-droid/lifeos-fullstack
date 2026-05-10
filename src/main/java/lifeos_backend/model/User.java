package com.lifeos.lifeos_backend.model;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "users")
public class User {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String name;

    @Column(nullable = false, unique = true)
    private String email;

    @Column(nullable = false)
    private String password;

    private int age;
    private double weightLbs;
    private int heightFeet;
    private int heightInches;
    private String goal;
    private String activity;
    private String sex;

    private LocalDateTime createdAt = LocalDateTime.now();

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }
    public String getPassword() { return password; }
    public void setPassword(String password) { this.password = password; }
    public int getAge() { return age; }
    public void setAge(int age) { this.age = age; }
    public double getWeightLbs() { return weightLbs; }
    public void setWeightLbs(double w) { this.weightLbs = w; }
    public int getHeightFeet() { return heightFeet; }
    public void setHeightFeet(int h) { this.heightFeet = h; }
    public int getHeightInches() { return heightInches; }
    public void setHeightInches(int h) { this.heightInches = h; }
    public String getGoal() { return goal; }
    public void setGoal(String goal) { this.goal = goal; }
    public String getActivity() { return activity; }
    public void setActivity(String activity) { this.activity = activity; }
    public String getSex() { return sex; }
    public void setSex(String sex) { this.sex = sex; }
    public LocalDateTime getCreatedAt() { return createdAt; }
}
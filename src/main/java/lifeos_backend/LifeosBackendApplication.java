package com.lifeos.lifeos_backend;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.context.annotation.ComponentScan;
import org.springframework.data.jpa.repository.config.EnableJpaRepositories;

@SpringBootApplication
@ComponentScan(basePackages = {"com.lifeos.lifeos_backend", "lifeos_backend"})
@EnableJpaRepositories(basePackages = {"com.lifeos.lifeos_backend.repository", "lifeos_backend.repository"})
public class LifeosBackendApplication {

	public static void main(String[] args) {
		SpringApplication.run(LifeosBackendApplication.class, args);
	}
}
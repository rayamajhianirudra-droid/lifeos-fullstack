package lifeos_backend;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.context.annotation.ComponentScan;
import org.springframework.data.jpa.repository.config.EnableJpaRepositories;

@SpringBootApplication
@ComponentScan(basePackages = {"lifeos_backend"})
@EnableJpaRepositories(basePackages = {"lifeos_backend.repository"})
public class LifeosBackendApplication {

	public static void main(String[] args) {
		SpringApplication.run(LifeosBackendApplication.class, args);
	}
}
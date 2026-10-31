package lifeos_backend.controller;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

/**
 * Liveness check for the hosting platform and the uptime pinger.
 *
 * Public and deliberately does NOT touch the database: a pinger hits this every
 * few minutes to keep the free web instance awake, and if it queried Postgres it
 * would also keep the serverless database awake and burn its free compute hours.
 * It returns nothing about users, config or versions.
 */
@RestController
public class HealthController {

    private static final Map<String, String> OK = Map.of("status", "ok");

    @GetMapping("/api/health")
    public Map<String, String> health() {
        return OK;
    }
}

package lifeos_backend.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.util.Arrays;
import java.util.Locale;
import java.util.Set;
import java.util.stream.Collectors;

/**
 * Who may open the admin dashboard. Read only from the ADMIN_EMAILS environment
 * variable (comma separated), never from the database or the client, so a user
 * can't grant themselves access. Unset means nobody is an admin.
 */
@Component
public class AdminAccess {

    private final Set<String> adminEmails;

    public AdminAccess(@Value("${ADMIN_EMAILS:}") String raw) {
        this.adminEmails = parse(raw);
    }

    static Set<String> parse(String raw) {
        if (raw == null || raw.isBlank()) return Set.of();
        return Arrays.stream(raw.split(","))
                .map(s -> s.trim().toLowerCase(Locale.ROOT))
                .filter(s -> s.contains("@"))
                .collect(Collectors.toUnmodifiableSet());
    }

    public boolean isAdmin(String email) {
        return email != null && adminEmails.contains(email.trim().toLowerCase(Locale.ROOT));
    }
}

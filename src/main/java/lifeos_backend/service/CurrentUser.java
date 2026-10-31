package lifeos_backend.service;

import lifeos_backend.model.User;
import lifeos_backend.repository.UserRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ResponseStatusException;

/** Resolves the logged-in user from the Authorization header (identity always comes from the JWT). */
@Component
public class CurrentUser {

    private final JwtService jwtService;
    private final UserRepository userRepository;

    public CurrentUser(JwtService jwtService, UserRepository userRepository) {
        this.jwtService = jwtService;
        this.userRepository = userRepository;
    }

    public User from(String authHeader) {
        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED);
        }
        String email = jwtService.extractEmail(authHeader.substring(7));
        return userRepository.findByEmail(email)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED));
    }
}

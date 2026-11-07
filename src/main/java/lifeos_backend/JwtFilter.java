package lifeos_backend;

import lifeos_backend.repository.UserRepository;
import lifeos_backend.service.SessionCheckCache;
import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.Date;

import lifeos_backend.service.JwtService;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;
import java.io.IOException;
import java.util.List;

@Component
public class JwtFilter extends OncePerRequestFilter {

    private final JwtService jwtService;
    private final UserRepository userRepository;
    private final SessionCheckCache sessionCache;

    public JwtFilter(JwtService jwtService, UserRepository userRepository, SessionCheckCache sessionCache) {
        this.jwtService = jwtService;
        this.userRepository = userRepository;
        this.sessionCache = sessionCache;
    }

    /**
     * A token only counts while its account exists and was issued after that account
     * was created. So deleting an account ends every session at once, and an old
     * token can never reach a new account later made with the same email.
     */
    static boolean belongsToCurrentAccount(Date issuedAt, LocalDateTime accountCreatedAt) {
        if (accountCreatedAt == null || issuedAt == null) return true;   // rows from before createdAt existed
        Instant created = accountCreatedAt.atZone(ZoneId.systemDefault()).toInstant();
        if (created.isAfter(Instant.now())) return true;                    // clock oddity: never lock anyone out
        // JWT "iat" is whole seconds, so allow 2 s for the time between saving the user and signing.
        return !issuedAt.toInstant().plusSeconds(2).isBefore(created);
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain filterChain)
            throws ServletException, IOException {

        String authHeader = request.getHeader("Authorization");

        if (authHeader != null && authHeader.startsWith("Bearer ")) {
            String token = authHeader.substring(7);
            if (jwtService.isTokenValid(token)) {
                String email = jwtService.extractEmail(token);
                Date issuedAt = jwtService.extractIssuedAt(token);
                SessionCheckCache.Account account = sessionCache.get(email);
                if (account == null) {
                    account = userRepository.findByEmail(email)
                            .map(u -> new SessionCheckCache.Account(true, u.getCreatedAt()))
                            .orElse(SessionCheckCache.Account.GONE);
                    sessionCache.put(email, account);
                }
                boolean current = account.exists() && belongsToCurrentAccount(issuedAt, account.createdAt());
                if (current) {
                    UsernamePasswordAuthenticationToken auth =
                            new UsernamePasswordAuthenticationToken(email, null, List.of());
                    SecurityContextHolder.getContext().setAuthentication(auth);
                }
            }
        }
        filterChain.doFilter(request, response);
    }
}
package lifeos_backend.repository;

import lifeos_backend.model.PasswordResetToken;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.Optional;

/**
 * Repository for password reset tokens.
 *
 * Key queries:
 * - findByTokenHash: look up a stored token by its BCrypt hash during reset
 * - deleteByEmail: clean up all tokens for an email (after successful reset,
 *   or before issuing a new one to avoid orphaned rows)
 * - countByEmailAndCreatedAtAfter: rate-limit check — how many requests has
 *   this email made in the last hour?
 * - deleteByExpiresAtBefore: housekeeping — remove expired tokens from DB
 *   (can be called on a schedule or at startup)
 */
public interface PasswordResetTokenRepository extends JpaRepository<PasswordResetToken, Long> {

    Optional<PasswordResetToken> findByTokenHash(String tokenHash);

    /** All active (non-expired) tokens for a given email. Used during reset to
     *  BCrypt-match the raw token without scanning the full table. */
    java.util.List<PasswordResetToken> findByEmail(String email);

    @Modifying
    @Transactional
    void deleteByEmail(String email);

    long countByEmailAndCreatedAtAfter(String email, LocalDateTime since);

    @Modifying
    @Transactional
    void deleteByExpiresAtBefore(LocalDateTime now);
}

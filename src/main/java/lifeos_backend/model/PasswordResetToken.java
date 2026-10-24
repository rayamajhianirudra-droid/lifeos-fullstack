package lifeos_backend.model;

import jakarta.persistence.*;
import java.time.LocalDateTime;

/**
 * Stores a bcrypt-hashed password reset token in the database.
 *
 * Security properties:
 * - Raw token is NEVER stored — only a BCrypt hash. If the DB is compromised,
 *   tokens cannot be reversed and used by an attacker.
 * - Tokens expire after 15 minutes (enforced at application level via expiresAt).
 * - Tokens are single-use: deleted immediately upon successful password reset.
 * - Rate limiting is enforced by querying createdAt per email (max 3/hour).
 *
 * Hibernate will auto-create/update the `password_reset_tokens` table via
 * spring.jpa.hibernate.ddl-auto=update in application.properties.
 */
@Entity
@Table(name = "password_reset_tokens", indexes = {
        @Index(name = "idx_prt_email", columnList = "email"),
        @Index(name = "idx_prt_token_hash", columnList = "token_hash")
})
public class PasswordResetToken {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /**
     * BCrypt hash of the raw UUID token sent to the user's email.
     * Raw token is never persisted anywhere.
     */
    @Column(name = "token_hash", nullable = false, unique = true, length = 72)
    private String tokenHash;

    /**
     * The email address this reset request belongs to.
     */
    @Column(nullable = false, length = 255)
    private String email;

    /**
     * When this token expires. Set to now + 15 minutes at creation time.
     */
    @Column(name = "expires_at", nullable = false)
    private LocalDateTime expiresAt;

    /**
     * When this token was created. Used for rate-limit queries.
     */
    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    // -------------------------------------------------------------------------
    // Constructors
    // -------------------------------------------------------------------------

    public PasswordResetToken() {}

    public PasswordResetToken(String tokenHash, String email) {
        this.tokenHash = tokenHash;
        this.email = email;
        this.createdAt = LocalDateTime.now();
        this.expiresAt = this.createdAt.plusMinutes(15);
    }

    // -------------------------------------------------------------------------
    // Helpers
    // -------------------------------------------------------------------------

    /** Returns true if this token is past its expiry time. */
    public boolean isExpired() {
        return LocalDateTime.now().isAfter(this.expiresAt);
    }

    // -------------------------------------------------------------------------
    // Getters & Setters
    // -------------------------------------------------------------------------

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getTokenHash() { return tokenHash; }
    public void setTokenHash(String tokenHash) { this.tokenHash = tokenHash; }

    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }

    public LocalDateTime getExpiresAt() { return expiresAt; }
    public void setExpiresAt(LocalDateTime expiresAt) { this.expiresAt = expiresAt; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
}

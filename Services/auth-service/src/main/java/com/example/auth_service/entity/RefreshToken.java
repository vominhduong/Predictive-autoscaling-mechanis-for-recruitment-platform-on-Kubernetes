package com.example.auth_service.entity;

import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "refresh_tokens")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class RefreshToken {
    @Id @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;
    @Column(name = "token_hash", nullable = false, unique = true, length = 255)
    private String tokenHash;
    @Column(name = "expires_at", nullable = false)
    private Instant expiresAt;
    @Column(name = "revoked_at")
    private Instant revokedAt;
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Builder
    private RefreshToken(User user, String tokenHash, Instant expiresAt, Instant revokedAt) {
        this.user = user;
        this.tokenHash = tokenHash;
        this.expiresAt = expiresAt;
        this.revokedAt = revokedAt;
    }

    @PrePersist
    void onCreate() { createdAt = Instant.now(); }
    public boolean isExpired(Instant now) { return !expiresAt.isAfter(now); }
    public boolean isRevoked() { return revokedAt != null; }
    public boolean isActive(Instant now) { return !isRevoked() && !isExpired(now); }
}

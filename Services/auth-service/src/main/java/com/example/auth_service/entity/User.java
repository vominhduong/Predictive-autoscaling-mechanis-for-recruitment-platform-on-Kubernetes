package com.example.auth_service.entity;

import com.example.auth_service.enums.UserRole;
import com.example.auth_service.enums.UserStatus;
import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "users")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class User {
    @Id @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;
    @Column(nullable = false, length = 255)
    private String email;
    @Column(name = "password_hash", nullable = false, length = 255)
    private String passwordHash;
    @Enumerated(EnumType.STRING) @Column(nullable = false, length = 30)
    private UserRole role;
    @Enumerated(EnumType.STRING) @Column(nullable = false, length = 30)
    private UserStatus status;
    @Column(name = "email_verified", nullable = false)
    private boolean emailVerified;
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;
    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;
    @Version @Column(nullable = false)
    private long version;

    @Builder
    private User(String email, String passwordHash, UserRole role, UserStatus status, boolean emailVerified) {
        this.email = email;
        this.passwordHash = passwordHash;
        this.role = role;
        this.status = status;
        this.emailVerified = emailVerified;
    }

    @PrePersist
    void onCreate() {
        Instant now = Instant.now();
        createdAt = now;
        updatedAt = now;
    }

    @PreUpdate
    void onUpdate() { updatedAt = Instant.now(); }
}

package com.example.auth_service.dto.response;

import com.example.auth_service.enums.UserRole;
import com.example.auth_service.enums.UserStatus;

import java.time.Instant;
import java.util.UUID;

public record UserResponse(
        UUID id,
        String email,
        UserRole role,
        UserStatus status,
        boolean emailVerified,
        Instant createdAt
) {
}

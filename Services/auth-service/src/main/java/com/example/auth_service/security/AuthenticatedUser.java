package com.example.auth_service.security;

import com.example.auth_service.enums.UserRole;
import java.util.UUID;

public record AuthenticatedUser(UUID id, String email, UserRole role) {}

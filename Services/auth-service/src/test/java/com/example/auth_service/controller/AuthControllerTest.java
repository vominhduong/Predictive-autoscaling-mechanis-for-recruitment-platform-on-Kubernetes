package com.example.auth_service.controller;

import com.example.auth_service.dto.response.UserResponse;
import com.example.auth_service.dto.response.LoginResponse;
import com.example.auth_service.enums.UserRole;
import com.example.auth_service.enums.UserStatus;
import com.example.auth_service.exception.GlobalExceptionHandler;
import com.example.auth_service.service.AuthService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import java.time.Instant;
import java.util.UUID;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@ExtendWith(MockitoExtension.class)
class AuthControllerTest {
    private static final String ENDPOINT = "/api/v1/auth/register";

    @Mock private AuthService authService;
    private MockMvc mockMvc;

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders.standaloneSetup(new AuthController(authService))
                .setControllerAdvice(new GlobalExceptionHandler()).build();
    }

    @Test
    void returnsCreatedWithoutSensitiveFields() throws Exception {
        UserResponse response = new UserResponse(UUID.randomUUID(), "candidate@example.com",
                UserRole.CANDIDATE, UserStatus.ACTIVE, false, Instant.parse("2026-01-01T00:00:00Z"));
        when(authService.register(any())).thenReturn(response);
        mockMvc.perform(request("candidate@example.com", "StrongPass@123", "CANDIDATE"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.email").value("candidate@example.com"))
                .andExpect(jsonPath("$.data.password").doesNotExist())
                .andExpect(jsonPath("$.data.passwordHash").doesNotExist());
    }

    @Test
    void loginReturnsAccessToken() throws Exception {
        when(authService.login(any())).thenReturn(
                new LoginResponse("signed-token", "refresh-token", "Bearer", 1800, 604800));
        mockMvc.perform(post("/api/v1/auth/login").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"candidate@example.com\",\"password\":\"StrongPass@123\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.accessToken").value("signed-token"))
                .andExpect(jsonPath("$.data.tokenType").value("Bearer"))
                .andExpect(jsonPath("$.data.expiresIn").value(1800));
    }

    @Test void rejectsBlankEmail() throws Exception {
        assertValidationError("", "StrongPass@123", "CANDIDATE", "email");
    }
    @Test void rejectsMalformedEmail() throws Exception {
        assertValidationError("not-an-email", "StrongPass@123", "CANDIDATE", "email");
    }
    @Test void rejectsShortPassword() throws Exception {
        assertValidationError("candidate@example.com", "Aa1@", "CANDIDATE", "password");
    }
    @Test void rejectsPasswordWithoutUppercase() throws Exception {
        assertValidationError("candidate@example.com", "strongpass@123", "CANDIDATE", "password");
    }
    @Test void rejectsPasswordWithoutLowercase() throws Exception {
        assertValidationError("candidate@example.com", "STRONGPASS@123", "CANDIDATE", "password");
    }
    @Test void rejectsPasswordWithoutDigit() throws Exception {
        assertValidationError("candidate@example.com", "StrongPass@abc", "CANDIDATE", "password");
    }
    @Test void rejectsPasswordWithoutSpecialCharacter() throws Exception {
        assertValidationError("candidate@example.com", "StrongPass123", "CANDIDATE", "password");
    }
    @Test void rejectsNullRole() throws Exception {
        assertValidationError("candidate@example.com", "StrongPass@123", null, "role");
    }

    @Test
    void rejectsUnknownRole() throws Exception {
        mockMvc.perform(request("candidate@example.com", "StrongPass@123", "MANAGER"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("INVALID_REQUEST"));
        verify(authService, never()).register(any());
    }

    private void assertValidationError(String email, String password, String role, String field)
            throws Exception {
        mockMvc.perform(request(email, password, role))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("VALIDATION_ERROR"))
                .andExpect(jsonPath("$.fieldErrors[?(@.field == '%s')]".formatted(field)).exists());
        verify(authService, never()).register(any());
    }

    private MockHttpServletRequestBuilder request(String email, String password, String role) {
        String roleJson = role == null ? "null" : "\"" + role + "\"";
        String body = """ 
                {"email":"%s","password":"%s","role":%s}
                """.formatted(email, password, roleJson);
        return post(ENDPOINT).contentType(MediaType.APPLICATION_JSON).content(body);
    }
}

package com.example.auth_service.service;

import com.example.auth_service.dto.request.RegisterRequest;
import com.example.auth_service.dto.request.LoginRequest;
import com.example.auth_service.dto.response.LoginResponse;
import com.example.auth_service.dto.response.UserResponse;
import com.example.auth_service.entity.User;
import com.example.auth_service.enums.UserRole;
import com.example.auth_service.enums.UserStatus;
import com.example.auth_service.exception.BusinessException;
import com.example.auth_service.exception.EmailAlreadyExistsException;
import com.example.auth_service.exception.ErrorCode;
import com.example.auth_service.exception.InvalidCredentialsException;
import com.example.auth_service.mapper.UserMapper;
import com.example.auth_service.repository.UserRepository;
import com.example.auth_service.service.impl.AuthServiceImpl;
import com.example.auth_service.security.JwtService;
import com.example.auth_service.security.RefreshTokenGenerator;
import com.example.auth_service.security.TokenHashService;
import com.example.auth_service.repository.RefreshTokenRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.security.crypto.password.PasswordEncoder;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class AuthServiceImplTest {
    private static final String RAW_PASSWORD = "StrongPass@123";
    private static final String ENCODED_PASSWORD = "$2a$10$encoded-password";

    @Mock private UserRepository userRepository;
    @Mock private PasswordEncoder passwordEncoder;
    @Mock private JwtService jwtService;
    @Mock private RefreshTokenRepository refreshTokenRepository;
    @Mock private RefreshTokenGenerator refreshTokenGenerator;
    @Mock private TokenHashService tokenHashService;
    private AuthService authService;

    @BeforeEach
    void setUp() {
        authService = new AuthServiceImpl(userRepository, passwordEncoder, new UserMapper(), jwtService,
                refreshTokenRepository, refreshTokenGenerator, tokenHashService, java.time.Duration.ofDays(7),
                java.time.Clock.systemUTC());
    }

    @Test
    void registersCandidateSuccessfully() {
        stubSuccessfulSave();
        UserResponse response = authService.register(request("candidate@example.com", UserRole.CANDIDATE));
        assertThat(response.role()).isEqualTo(UserRole.CANDIDATE);
        assertThat(response.status()).isEqualTo(UserStatus.ACTIVE);
        assertThat(response.emailVerified()).isFalse();
    }

    @Test
    void registersEmployerSuccessfully() {
        stubSuccessfulSave();
        UserResponse response = authService.register(request("employer@example.com", UserRole.EMPLOYER));
        assertThat(response.role()).isEqualTo(UserRole.EMPLOYER);
        assertThat(response.status()).isEqualTo(UserStatus.ACTIVE);
    }

    @Test
    void trimsAndLowercasesEmail() {
        stubSuccessfulSave();
        authService.register(request("  Candidate@Example.COM  ", UserRole.CANDIDATE));
        ArgumentCaptor<User> captor = ArgumentCaptor.forClass(User.class);
        verify(userRepository).existsByEmailIgnoreCase("candidate@example.com");
        verify(userRepository).saveAndFlush(captor.capture());
        assertThat(captor.getValue().getEmail()).isEqualTo("candidate@example.com");
    }

    @Test
    void encodesPasswordBeforeSaving() {
        stubSuccessfulSave();
        authService.register(request("candidate@example.com", UserRole.CANDIDATE));
        ArgumentCaptor<User> captor = ArgumentCaptor.forClass(User.class);
        verify(passwordEncoder).encode(RAW_PASSWORD);
        verify(userRepository).saveAndFlush(captor.capture());
        assertThat(captor.getValue().getPasswordHash()).isEqualTo(ENCODED_PASSWORD);
        assertThat(captor.getValue().getPasswordHash()).isNotEqualTo(RAW_PASSWORD);
    }

    @Test
    void rejectsExistingEmailWithEmailAlreadyExists() {
        when(userRepository.existsByEmailIgnoreCase("candidate@example.com")).thenReturn(true);
        assertThatThrownBy(() -> authService.register(request("candidate@example.com", UserRole.CANDIDATE)))
                .isInstanceOfSatisfying(EmailAlreadyExistsException.class,
                        exception -> assertThat(exception.getErrorCode()).isEqualTo(ErrorCode.EMAIL_ALREADY_EXISTS));
        verify(userRepository, never()).saveAndFlush(any());
    }

    @Test
    void rejectsAdminRegistration() {
        assertThatThrownBy(() -> authService.register(request("admin@example.com", UserRole.ADMIN)))
                .isInstanceOfSatisfying(BusinessException.class,
                        exception -> assertThat(exception.getErrorCode()).isEqualTo(ErrorCode.INVALID_ROLE));
        verify(userRepository, never()).saveAndFlush(any());
    }

    @Test
    void mapsSaveRaceConditionToEmailAlreadyExists() {
        when(passwordEncoder.encode(RAW_PASSWORD)).thenReturn(ENCODED_PASSWORD);
        when(userRepository.saveAndFlush(any(User.class)))
                .thenThrow(new DataIntegrityViolationException("uk_users_email_lower"));
        assertThatThrownBy(() -> authService.register(request("candidate@example.com", UserRole.CANDIDATE)))
                .isInstanceOfSatisfying(EmailAlreadyExistsException.class,
                        exception -> assertThat(exception.getErrorCode()).isEqualTo(ErrorCode.EMAIL_ALREADY_EXISTS));
    }

    @Test
    void logsInWithNormalizedEmailAndValidPassword() {
        User user = user(UserStatus.ACTIVE);
        LoginResponse token = new LoginResponse("signed-token", "raw-refresh", "Bearer", 1800, 604800);
        when(userRepository.findByEmailIgnoreCase("candidate@example.com")).thenReturn(java.util.Optional.of(user));
        when(passwordEncoder.matches(RAW_PASSWORD, ENCODED_PASSWORD)).thenReturn(true);
        when(refreshTokenGenerator.generate()).thenReturn("raw-refresh");
        when(tokenHashService.hash("raw-refresh")).thenReturn("refresh-hash");
        when(jwtService.createAccessToken(user)).thenReturn("signed-token");
        when(jwtService.getExpirationSeconds()).thenReturn(1800L);
        assertThat(authService.login(new LoginRequest("  Candidate@Example.COM  ", RAW_PASSWORD))).isEqualTo(token);
    }

    @Test
    void rejectsWrongPasswordWithoutRevealingAccount() {
        when(userRepository.findByEmailIgnoreCase("candidate@example.com"))
                .thenReturn(java.util.Optional.of(user(UserStatus.ACTIVE)));
        assertThatThrownBy(() -> authService.login(new LoginRequest("candidate@example.com", "WrongPass@123")))
                .isInstanceOf(InvalidCredentialsException.class);
    }

    @Test
    void rejectsUnknownEmailWithSameInvalidCredentialsError() {
        assertThatThrownBy(() -> authService.login(new LoginRequest("missing@example.com", RAW_PASSWORD)))
                .isInstanceOf(InvalidCredentialsException.class);
    }

    @Test
    void rejectsLockedAccount() {
        assertStatusRejected(UserStatus.LOCKED, ErrorCode.ACCOUNT_LOCKED);
    }

    @Test
    void rejectsDisabledAccount() {
        assertStatusRejected(UserStatus.DISABLED, ErrorCode.ACCOUNT_DISABLED);
    }

    private void assertStatusRejected(UserStatus status, ErrorCode errorCode) {
        User user = user(status);
        when(userRepository.findByEmailIgnoreCase("candidate@example.com")).thenReturn(java.util.Optional.of(user));
        when(passwordEncoder.matches(RAW_PASSWORD, ENCODED_PASSWORD)).thenReturn(true);
        assertThatThrownBy(() -> authService.login(new LoginRequest("candidate@example.com", RAW_PASSWORD)))
                .isInstanceOfSatisfying(BusinessException.class,
                        exception -> assertThat(exception.getErrorCode()).isEqualTo(errorCode));
    }

    private User user(UserStatus status) {
        return User.builder().email("candidate@example.com").passwordHash(ENCODED_PASSWORD)
                .role(UserRole.CANDIDATE).status(status).emailVerified(false).build();
    }

    private RegisterRequest request(String email, UserRole role) {
        return new RegisterRequest(email, RAW_PASSWORD, role);
    }

    private void stubSuccessfulSave() {
        when(passwordEncoder.encode(RAW_PASSWORD)).thenReturn(ENCODED_PASSWORD);
        when(userRepository.saveAndFlush(any(User.class))).thenAnswer(invocation -> invocation.getArgument(0));
    }
}

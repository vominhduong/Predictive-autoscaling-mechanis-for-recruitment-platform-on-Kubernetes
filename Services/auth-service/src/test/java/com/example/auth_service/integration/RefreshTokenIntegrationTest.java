package com.example.auth_service.integration;

import com.example.auth_service.AbstractPostgresIntegrationTest;
import com.example.auth_service.dto.request.LoginRequest;
import com.example.auth_service.dto.request.LogoutRequest;
import com.example.auth_service.dto.request.RefreshTokenRequest;
import com.example.auth_service.dto.response.LoginResponse;
import com.example.auth_service.entity.RefreshToken;
import com.example.auth_service.entity.User;
import com.example.auth_service.enums.UserRole;
import com.example.auth_service.enums.UserStatus;
import com.example.auth_service.exception.BusinessException;
import com.example.auth_service.exception.ErrorCode;
import com.example.auth_service.exception.InvalidTokenException;
import com.example.auth_service.repository.RefreshTokenRepository;
import com.example.auth_service.repository.UserRepository;
import com.example.auth_service.security.TokenHashService;
import com.example.auth_service.service.AuthService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.ActiveProfiles;

import java.time.Instant;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.Executors;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

@SpringBootTest
@ActiveProfiles("test")
class RefreshTokenIntegrationTest extends AbstractPostgresIntegrationTest {
    private static final String PASSWORD = "StrongPass@123";

    @Autowired private AuthService authService;
    @Autowired private UserRepository userRepository;
    @Autowired private RefreshTokenRepository refreshTokenRepository;
    @Autowired private PasswordEncoder passwordEncoder;
    @Autowired private TokenHashService tokenHashService;

    @BeforeEach
    void cleanDatabase() {
        refreshTokenRepository.deleteAll();
        userRepository.deleteAll();
    }

    @Test
    void loginCreatesRefreshTokenAndStoresOnlyItsHash() {
        User user = createUser(UserStatus.ACTIVE);
        LoginResponse response = login(user);

        assertThat(response.refreshToken()).isNotBlank().doesNotContain("=");
        assertThat(response.refreshExpiresIn()).isEqualTo(604800);
        RefreshToken stored = refreshTokenRepository.findByTokenHash(
                tokenHashService.hash(response.refreshToken())).orElseThrow();
        assertThat(stored.getTokenHash()).isNotEqualTo(response.refreshToken());
        assertThat(stored.getTokenHash()).hasSize(64);
    }

    @Test
    void refreshRotatesTokenAndOldTokenCannotBeReused() {
        LoginResponse login = login(createUser(UserStatus.ACTIVE));
        LoginResponse rotated = authService.refresh(new RefreshTokenRequest(login.refreshToken()));

        assertThat(rotated.refreshToken()).isNotEqualTo(login.refreshToken());
        assertThat(refreshTokenRepository.findByTokenHash(tokenHashService.hash(login.refreshToken())))
                .get().extracting(RefreshToken::isRevoked).isEqualTo(true);
        assertThatThrownBy(() -> authService.refresh(new RefreshTokenRequest(login.refreshToken())))
                .isInstanceOf(InvalidTokenException.class);
    }

    @Test
    void expiredTokenIsRejected() {
        String raw = "expired-refresh-token";
        saveToken(createUser(UserStatus.ACTIVE), raw, Instant.now().minusSeconds(1), null);
        assertInvalid(raw);
    }

    @Test
    void revokedTokenIsRejected() {
        String raw = "revoked-refresh-token";
        saveToken(createUser(UserStatus.ACTIVE), raw, Instant.now().plusSeconds(600), Instant.now());
        assertInvalid(raw);
    }

    @Test
    void randomTokenIsRejected() {
        assertInvalid("unknown-random-refresh-token");
    }

    @Test
    void concurrentRefreshAllowsExactlyOneSuccess() throws Exception {
        String raw = login(createUser(UserStatus.ACTIVE)).refreshToken();
        CountDownLatch ready = new CountDownLatch(2);
        CountDownLatch start = new CountDownLatch(1);
        try (var executor = Executors.newFixedThreadPool(2)) {
            List<java.util.concurrent.Future<Boolean>> futures = List.of(
                    executor.submit(() -> refreshAfterSignal(raw, ready, start)),
                    executor.submit(() -> refreshAfterSignal(raw, ready, start)));
            ready.await();
            start.countDown();
            long successes = 0;
            for (var future : futures) {
                if (future.get()) successes++;
            }
            assertThat(successes).isEqualTo(1);
        }
    }

    @Test
    void logoutRevokesTokenAndCanBeRepeated() {
        String raw = login(createUser(UserStatus.ACTIVE)).refreshToken();
        authService.logout(new LogoutRequest(raw));
        authService.logout(new LogoutRequest(raw));
        assertThat(refreshTokenRepository.findByTokenHash(tokenHashService.hash(raw)))
                .get().extracting(RefreshToken::isRevoked).isEqualTo(true);
        assertInvalid(raw);
    }

    @Test
    void logoutWithUnknownTokenIsIdempotent() {
        authService.logout(new LogoutRequest("unknown-token"));
        authService.logout(new LogoutRequest("unknown-token"));
    }

    @Test
    void lockedUserCannotRefresh() {
        assertAccountCannotRefresh(UserStatus.LOCKED, ErrorCode.ACCOUNT_LOCKED);
    }

    @Test
    void disabledUserCannotRefresh() {
        assertAccountCannotRefresh(UserStatus.DISABLED, ErrorCode.ACCOUNT_DISABLED);
    }

    private boolean refreshAfterSignal(String raw, CountDownLatch ready, CountDownLatch start) throws Exception {
        ready.countDown();
        start.await();
        try {
            authService.refresh(new RefreshTokenRequest(raw));
            return true;
        } catch (InvalidTokenException exception) {
            return false;
        }
    }

    private void assertAccountCannotRefresh(UserStatus status, ErrorCode expected) {
        String raw = status.name().toLowerCase() + "-token";
        saveToken(createUser(status), raw, Instant.now().plusSeconds(600), null);
        assertThatThrownBy(() -> authService.refresh(new RefreshTokenRequest(raw)))
                .isInstanceOfSatisfying(BusinessException.class,
                        exception -> assertThat(exception.getErrorCode()).isEqualTo(expected));
    }

    private void assertInvalid(String raw) {
        assertThatThrownBy(() -> authService.refresh(new RefreshTokenRequest(raw)))
                .isInstanceOf(InvalidTokenException.class);
    }

    private LoginResponse login(User user) {
        return authService.login(new LoginRequest(user.getEmail(), PASSWORD));
    }

    private User createUser(UserStatus status) {
        String email = UUID.randomUUID() + "@example.com";
        return userRepository.saveAndFlush(User.builder().email(email)
                .passwordHash(passwordEncoder.encode(PASSWORD)).role(UserRole.CANDIDATE)
                .status(status).emailVerified(false).build());
    }

    private void saveToken(User user, String raw, Instant expiresAt, Instant revokedAt) {
        refreshTokenRepository.saveAndFlush(RefreshToken.builder().user(user)
                .tokenHash(tokenHashService.hash(raw)).expiresAt(expiresAt).revokedAt(revokedAt).build());
    }
}

package com.example.auth_service.service.impl;

import com.example.auth_service.dto.request.LoginRequest;
import com.example.auth_service.dto.request.LogoutRequest;
import com.example.auth_service.dto.request.RefreshTokenRequest;
import com.example.auth_service.dto.request.RegisterRequest;
import com.example.auth_service.dto.response.LoginResponse;
import com.example.auth_service.dto.response.UserResponse;
import com.example.auth_service.entity.User;
import com.example.auth_service.entity.RefreshToken;
import com.example.auth_service.enums.UserRole;
import com.example.auth_service.enums.UserStatus;
import com.example.auth_service.exception.BusinessException;
import com.example.auth_service.exception.EmailAlreadyExistsException;
import com.example.auth_service.exception.ErrorCode;
import com.example.auth_service.exception.InvalidCredentialsException;
import com.example.auth_service.exception.InvalidTokenException;
import com.example.auth_service.mapper.UserMapper;
import com.example.auth_service.repository.UserRepository;
import com.example.auth_service.repository.RefreshTokenRepository;
import com.example.auth_service.service.AuthService;
import com.example.auth_service.security.JwtService;
import com.example.auth_service.security.RefreshTokenGenerator;
import com.example.auth_service.security.TokenHashService;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Locale;
import java.util.Set;
import java.time.Duration;
import java.time.Instant;
import java.time.Clock;

@Service
public class AuthServiceImpl implements AuthService {
    private static final Set<UserRole> PUBLIC_REGISTRATION_ROLES =
            Set.of(UserRole.CANDIDATE, UserRole.EMPLOYER);

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final UserMapper userMapper;
    private final JwtService jwtService;
    private final RefreshTokenRepository refreshTokenRepository;
    private final RefreshTokenGenerator refreshTokenGenerator;
    private final TokenHashService tokenHashService;
    private final Duration refreshTokenExpiration;
    private final Clock clock;

    public AuthServiceImpl(UserRepository userRepository, PasswordEncoder passwordEncoder,
                           UserMapper userMapper, JwtService jwtService,
                           RefreshTokenRepository refreshTokenRepository,
                           RefreshTokenGenerator refreshTokenGenerator,
                           TokenHashService tokenHashService,
                           @Value("${security.jwt.refresh-token-expiration}") Duration refreshTokenExpiration,
                           Clock clock) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.userMapper = userMapper;
        this.jwtService = jwtService;
        this.refreshTokenRepository = refreshTokenRepository;
        this.refreshTokenGenerator = refreshTokenGenerator;
        this.tokenHashService = tokenHashService;
        this.refreshTokenExpiration = refreshTokenExpiration;
        this.clock = clock;
    }

    @Override
    @Transactional
    public UserResponse register(RegisterRequest request) {
        String normalizedEmail = request.email().trim().toLowerCase(Locale.ROOT);

        if (userRepository.existsByEmailIgnoreCase(normalizedEmail)) {
            throw new EmailAlreadyExistsException();
        }
        if (!PUBLIC_REGISTRATION_ROLES.contains(request.role())) {
            throw new BusinessException(ErrorCode.INVALID_ROLE);
        }

        User user = User.builder()
                .email(normalizedEmail)
                .passwordHash(passwordEncoder.encode(request.password()))
                .role(request.role())
                .status(UserStatus.ACTIVE)
                .emailVerified(false)
                .build();

        try {
            return userMapper.toResponse(userRepository.saveAndFlush(user));
        } catch (DataIntegrityViolationException exception) {
            throw new EmailAlreadyExistsException();
        }
    }

    @Override
    @Transactional
    public LoginResponse login(LoginRequest request) {
        String email = request.email().trim().toLowerCase(Locale.ROOT);
        User user = userRepository.findByEmailIgnoreCase(email).orElseThrow(InvalidCredentialsException::new);
        if (!passwordEncoder.matches(request.password(), user.getPasswordHash())) {
            throw new InvalidCredentialsException();
        }
        validateUserStatus(user);
        return issueTokenPair(user, clock.instant());
    }

    @Override
    @Transactional
    public LoginResponse refresh(RefreshTokenRequest request) {
        String hash = tokenHashService.hash(request.refreshToken());
        RefreshToken current = refreshTokenRepository.findByTokenHashForUpdate(hash)
                .orElseThrow(InvalidTokenException::new);
        Instant now = clock.instant();
        if (!current.isActive(now)) {
            throw new InvalidTokenException();
        }
        validateUserStatus(current.getUser());
        current.revoke(now);
        return issueTokenPair(current.getUser(), now);
    }

    @Override
    @Transactional
    public void logout(LogoutRequest request) {
        String hash = tokenHashService.hash(request.refreshToken());
        refreshTokenRepository.findByTokenHashForUpdate(hash)
                .ifPresent(token -> token.revoke(clock.instant()));
    }

    private LoginResponse issueTokenPair(User user, Instant now) {
        String rawRefreshToken = refreshTokenGenerator.generate();
        RefreshToken refreshToken = RefreshToken.builder().user(user)
                .tokenHash(tokenHashService.hash(rawRefreshToken))
                .expiresAt(now.plus(refreshTokenExpiration)).build();
        refreshTokenRepository.save(refreshToken);
        return new LoginResponse(jwtService.createAccessToken(user), rawRefreshToken, "Bearer",
                jwtService.getExpirationSeconds(), refreshTokenExpiration.toSeconds());
    }

    private void validateUserStatus(User user) {
        if (user.getStatus() == UserStatus.LOCKED) {
            throw new BusinessException(ErrorCode.ACCOUNT_LOCKED);
        }
        if (user.getStatus() == UserStatus.DISABLED) {
            throw new BusinessException(ErrorCode.ACCOUNT_DISABLED);
        }
    }
}

package com.example.auth_service.security;

import com.example.auth_service.entity.User;
import com.example.auth_service.enums.UserRole;
import com.example.auth_service.exception.InvalidTokenException;
import com.nimbusds.jose.jwk.JWKSet;
import com.nimbusds.jose.jwk.RSAKey;
import com.nimbusds.jose.jwk.source.ImmutableJWKSet;
import com.nimbusds.jose.proc.SecurityContext;
import org.junit.jupiter.api.Test;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.oauth2.jwt.JwtEncoder;
import org.springframework.security.oauth2.jwt.JwtValidators;
import org.springframework.security.oauth2.jwt.NimbusJwtDecoder;
import org.springframework.security.oauth2.jwt.NimbusJwtEncoder;

import java.security.KeyPair;
import java.security.KeyPairGenerator;
import java.security.interfaces.RSAPrivateKey;
import java.security.interfaces.RSAPublicKey;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class JwtServiceTest {
    @Test
    void tokenContainsSubjectEmailRoleAndExpectedExpiry() throws Exception {
        KeyPair pair = keyPair();
        Instant now = Instant.now().truncatedTo(java.time.temporal.ChronoUnit.SECONDS);
        JwtService service = service(pair, Duration.ofMinutes(30), Clock.fixed(now, ZoneOffset.UTC));
        User user = mock(User.class);
        UUID id = UUID.randomUUID();
        when(user.getId()).thenReturn(id);
        when(user.getEmail()).thenReturn("candidate@example.com");
        when(user.getRole()).thenReturn(UserRole.CANDIDATE);

        String token = service.createAccessToken(user);
        AuthenticatedUser principal = service.authenticate(token);
        var decoded = decoder((RSAPublicKey) pair.getPublic()).decode(token);

        assertThat(principal).isEqualTo(new AuthenticatedUser(id, "candidate@example.com", UserRole.CANDIDATE));
        assertThat(decoded.getClaimAsString("iss")).isEqualTo("recruitment-auth-service");
        assertThat(decoded.getIssuedAt()).isEqualTo(now);
        assertThat(decoded.getExpiresAt()).isEqualTo(now.plusSeconds(1800));
        assertThat(decoded.getId()).isNotBlank();
    }

    @Test
    void rejectsTokenSignedByDifferentKey() throws Exception {
        JwtService issuer = service(keyPair(), Duration.ofMinutes(30), Clock.systemUTC());
        User user = mockUser();
        String token = issuer.createAccessToken(user);
        JwtService verifier = service(keyPair(), Duration.ofMinutes(30), Clock.systemUTC());
        assertThatThrownBy(() -> verifier.authenticate(token)).isInstanceOf(InvalidTokenException.class);
    }

    @Test
    void rejectsExpiredToken() throws Exception {
        KeyPair pair = keyPair();
        Clock oldClock = Clock.fixed(Instant.now().minus(Duration.ofHours(2)), ZoneOffset.UTC);
        JwtService service = service(pair, Duration.ofMinutes(30), oldClock);
        String token = service.createAccessToken(mockUser());
        assertThatThrownBy(() -> service.authenticate(token)).isInstanceOf(InvalidTokenException.class);
    }

    @Test
    void rejectsTokenFromDifferentIssuer() throws Exception {
        KeyPair pair = keyPair();
        JwtService issuer = service(pair, Duration.ofMinutes(30), Clock.systemUTC(), "unexpected-issuer");
        JwtService verifier = service(pair, Duration.ofMinutes(30), Clock.systemUTC());
        assertThatThrownBy(() -> verifier.authenticate(issuer.createAccessToken(mockUser())))
                .isInstanceOf(InvalidTokenException.class);
    }

    private JwtService service(KeyPair pair, Duration duration, Clock clock) {
        return service(pair, duration, clock, "recruitment-auth-service");
    }

    private JwtService service(KeyPair pair, Duration duration, Clock clock, String issuer) {
        RSAKey jwk = new RSAKey.Builder((RSAPublicKey) pair.getPublic())
                .privateKey((RSAPrivateKey) pair.getPrivate()).build();
        JwtEncoder encoder = new NimbusJwtEncoder(new ImmutableJWKSet<SecurityContext>(new JWKSet(jwk)));
        NimbusJwtDecoder decoder = decoder((RSAPublicKey) pair.getPublic());
        decoder.setJwtValidator(JwtValidators.createDefaultWithIssuer("recruitment-auth-service"));
        return new JwtService(encoder, decoder, duration, issuer, clock);
    }

    private NimbusJwtDecoder decoder(RSAPublicKey key) {
        return NimbusJwtDecoder.withPublicKey(key).build();
    }

    private KeyPair keyPair() throws Exception {
        KeyPairGenerator generator = KeyPairGenerator.getInstance("RSA");
        generator.initialize(2048);
        return generator.generateKeyPair();
    }

    private User mockUser() {
        User user = mock(User.class);
        when(user.getId()).thenReturn(UUID.randomUUID());
        when(user.getEmail()).thenReturn("candidate@example.com");
        when(user.getRole()).thenReturn(UserRole.CANDIDATE);
        return user;
    }
}

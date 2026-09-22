package com.example.auth_service.security;

import com.example.auth_service.entity.User;
import com.example.auth_service.enums.UserRole;
import com.example.auth_service.exception.InvalidTokenException;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.oauth2.jose.jws.SignatureAlgorithm;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.jwt.JwtClaimsSet;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.oauth2.jwt.JwtEncoder;
import org.springframework.security.oauth2.jwt.JwtEncoderParameters;
import org.springframework.security.oauth2.jwt.JwsHeader;
import org.springframework.stereotype.Service;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.UUID;

@Service
public class JwtService {
    private final JwtEncoder encoder;
    private final JwtDecoder decoder;
    private final Duration expiration;
    private final String issuer;
    private final Clock clock;

    @Autowired
    public JwtService(JwtEncoder encoder, JwtDecoder decoder,
                      @Value("${security.jwt.access-token-expiration}") Duration expiration,
                      @Value("${security.jwt.issuer}") String issuer) {
        this(encoder, decoder, expiration, issuer, Clock.systemUTC());
    }

    JwtService(JwtEncoder encoder, JwtDecoder decoder, Duration expiration, String issuer, Clock clock) {
        this.encoder = encoder;
        this.decoder = decoder;
        this.expiration = expiration;
        this.issuer = issuer;
        this.clock = clock;
    }

    public String createAccessToken(User user) {
        Instant issuedAt = clock.instant();
        JwtClaimsSet claims = JwtClaimsSet.builder().issuer(issuer).subject(user.getId().toString())
                .issuedAt(issuedAt).expiresAt(issuedAt.plus(expiration)).id(UUID.randomUUID().toString())
                .claim("email", user.getEmail()).claim("role", user.getRole().name()).build();
        return encoder.encode(JwtEncoderParameters.from(
                JwsHeader.with(SignatureAlgorithm.RS256).build(), claims)).getTokenValue();
    }

    public long getExpirationSeconds() { return expiration.toSeconds(); }

    public AuthenticatedUser authenticate(String token) {
        try {
            Jwt jwt = decoder.decode(token);
            return new AuthenticatedUser(UUID.fromString(jwt.getSubject()), jwt.getClaimAsString("email"),
                    UserRole.valueOf(jwt.getClaimAsString("role")));
        } catch (RuntimeException exception) {
            throw new InvalidTokenException();
        }
    }
}

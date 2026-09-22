package com.example.auth_service.security;

import org.junit.jupiter.api.Test;
import java.util.Base64;
import static org.assertj.core.api.Assertions.assertThat;

class RefreshTokenSecurityTest {
    @Test
    void generatorProducesUniqueUrlSafeTokensWithAtLeast256Bits() {
        RefreshTokenGenerator generator = new RefreshTokenGenerator();
        String first = generator.generate();
        String second = generator.generate();
        assertThat(first).isNotEqualTo(second).doesNotContain("=");
        assertThat(Base64.getUrlDecoder().decode(first)).hasSizeGreaterThanOrEqualTo(32);
    }

    @Test
    void hashIsDeterministicSha256AndDoesNotContainRawToken() {
        TokenHashService service = new TokenHashService();
        String raw = "opaque-secret-token";
        assertThat(service.hash(raw)).isEqualTo(service.hash(raw)).hasSize(64).doesNotContain(raw);
    }
}

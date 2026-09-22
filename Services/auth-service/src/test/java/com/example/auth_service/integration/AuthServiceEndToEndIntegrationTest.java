package com.example.auth_service.integration;

import com.example.auth_service.AbstractPostgresIntegrationTest;
import com.example.auth_service.repository.RefreshTokenRepository;
import com.example.auth_service.repository.UserRepository;
import com.example.auth_service.security.TokenHashService;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import java.time.Duration;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class AuthServiceEndToEndIntegrationTest extends AbstractPostgresIntegrationTest {
    private static final String PASSWORD = "StrongPass@123";

    @Autowired private MockMvc mockMvc;
    @Autowired private ObjectMapper objectMapper;
    @Autowired private UserRepository userRepository;
    @Autowired private RefreshTokenRepository refreshTokenRepository;
    @Autowired private PasswordEncoder passwordEncoder;
    @Autowired private TokenHashService tokenHashService;
    @Autowired private JwtDecoder jwtDecoder;
    @Autowired private JdbcTemplate jdbcTemplate;

    @BeforeEach
    void resetData() {
        refreshTokenRepository.deleteAll();
        userRepository.deleteAll();
    }

    @Test void registerCandidateSuccessfully() throws Exception {
        register(uniqueEmail(), "CANDIDATE").andExpect(status().isCreated())
                .andExpect(jsonPath("$.data.role").value("CANDIDATE"));
    }

    @Test void registerEmployerSuccessfully() throws Exception {
        register(uniqueEmail(), "EMPLOYER").andExpect(status().isCreated())
                .andExpect(jsonPath("$.data.role").value("EMPLOYER"));
    }

    @Test void registerAdminIsRejected() throws Exception {
        register(uniqueEmail(), "ADMIN").andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("INVALID_ROLE"));
    }

    @Test void duplicateEmailIgnoringCaseReturnsConflict() throws Exception {
        String email = uniqueEmail();
        register(email, "CANDIDATE").andExpect(status().isCreated());
        register(email.toUpperCase(), "CANDIDATE").andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("EMAIL_ALREADY_EXISTS"));
    }

    @Test void emailAndPasswordValidationAreApplied() throws Exception {
        mockMvc.perform(post("/api/v1/auth/register").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"invalid\",\"password\":\"weak\",\"role\":\"CANDIDATE\"}"))
                .andExpect(status().isBadRequest()).andExpect(jsonPath("$.code").value("VALIDATION_ERROR"));
    }

    @Test void passwordIsStoredAsBcrypt() throws Exception {
        String email = uniqueEmail();
        register(email, "CANDIDATE").andExpect(status().isCreated());
        String hash = userRepository.findByEmailIgnoreCase(email).orElseThrow().getPasswordHash();
        assertThat(hash).isNotEqualTo(PASSWORD);
        assertThat(passwordEncoder.matches(PASSWORD, hash)).isTrue();
    }

    @Test void loginSuccessfullyReturnsTokenPair() throws Exception {
        String email = registeredUser("CANDIDATE");
        login(email, PASSWORD).andExpect(status().isOk())
                .andExpect(jsonPath("$.data.accessToken").isNotEmpty())
                .andExpect(jsonPath("$.data.refreshToken").isNotEmpty());
    }

    @Test void wrongPasswordReturnsInvalidCredentials() throws Exception {
        String email = registeredUser("CANDIDATE");
        login(email, "WrongPass@123").andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value("INVALID_CREDENTIALS"));
    }

    @Test void unknownEmailReturnsSameInvalidCredentialsError() throws Exception {
        login(uniqueEmail(), PASSWORD).andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value("INVALID_CREDENTIALS"));
    }

    @Test void lockedUserCannotLogin() throws Exception {
        assertStatusCannotLogin("LOCKED", 423, "ACCOUNT_LOCKED");
    }

    @Test void disabledUserCannotLogin() throws Exception {
        assertStatusCannotLogin("DISABLED", 403, "ACCOUNT_DISABLED");
    }

    @Test void jwtContainsRequiredClaimsAndExpiry() throws Exception {
        String email = registeredUser("EMPLOYER");
        JsonNode data = data(login(email, PASSWORD).andReturn());
        var jwt = jwtDecoder.decode(data.get("accessToken").asText());
        UUID userId = userRepository.findByEmailIgnoreCase(email).orElseThrow().getId();
        assertThat(jwt.getSubject()).isEqualTo(userId.toString());
        assertThat(jwt.getClaimAsString("email")).isEqualTo(email);
        assertThat(jwt.getClaimAsString("role")).isEqualTo("EMPLOYER");
        assertThat(jwt.getClaimAsString("iss")).isEqualTo("recruitment-auth-service");
        assertThat(Duration.between(jwt.getIssuedAt(), jwt.getExpiresAt())).isEqualTo(Duration.ofMinutes(30));
    }

    @Test void tamperedJwtIsRejectedBySecurity() throws Exception {
        String token = data(login(registeredUser("CANDIDATE"), PASSWORD).andReturn())
                .get("accessToken").asText();
        String[] parts = token.split("\\.");
        char replacement = parts[1].charAt(0) == 'A' ? 'B' : 'A';
        parts[1] = replacement + parts[1].substring(1);
        String tampered = String.join(".", parts);
        mockMvc.perform(get("/actuator/info").header("Authorization", "Bearer " + tampered))
                .andExpect(status().isUnauthorized());
    }

    @Test void loginStoresOnlyRefreshTokenHash() throws Exception {
        JsonNode data = data(login(registeredUser("CANDIDATE"), PASSWORD).andReturn());
        String raw = data.get("refreshToken").asText();
        var stored = refreshTokenRepository.findByTokenHash(tokenHashService.hash(raw)).orElseThrow();
        assertThat(stored.getTokenHash()).isNotEqualTo(raw).hasSize(64);
    }

    @Test void refreshSuccessfullyReturnsNewPair() throws Exception {
        String raw = loginRefreshToken();
        refresh(raw).andExpect(status().isOk())
                .andExpect(jsonPath("$.data.accessToken").isNotEmpty())
                .andExpect(jsonPath("$.data.refreshToken").isNotEmpty());
    }

    @Test void refreshRotatesToken() throws Exception {
        String oldToken = loginRefreshToken();
        String newToken = data(refresh(oldToken).andReturn()).get("refreshToken").asText();
        assertThat(newToken).isNotEqualTo(oldToken);
        assertThat(refreshTokenRepository.findByTokenHash(tokenHashService.hash(oldToken)).orElseThrow().isRevoked()).isTrue();
    }

    @Test void rotatedTokenCannotBeReused() throws Exception {
        String oldToken = loginRefreshToken();
        refresh(oldToken).andExpect(status().isOk());
        refresh(oldToken).andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value("INVALID_TOKEN"));
    }

    @Test void expiredRefreshTokenIsRejected() throws Exception {
        String raw = loginRefreshToken();
        jdbcTemplate.update("update refresh_tokens set expires_at = ? where token_hash = ?",
                OffsetDateTime.now(ZoneOffset.UTC).minusSeconds(1), tokenHashService.hash(raw));
        refresh(raw).andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value("INVALID_TOKEN"));
    }

    @Test void logoutRevokesRefreshToken() throws Exception {
        TokenPair tokens = loginTokenPair();
        logout(tokens.refreshToken(), tokens.accessToken()).andExpect(status().isNoContent());
        assertThat(refreshTokenRepository.findByTokenHash(tokenHashService.hash(tokens.refreshToken()))
                .orElseThrow().isRevoked()).isTrue();
    }

    @Test void refreshAfterLogoutIsRejected() throws Exception {
        TokenPair tokens = loginTokenPair();
        logout(tokens.refreshToken(), tokens.accessToken()).andExpect(status().isNoContent());
        refresh(tokens.refreshToken()).andExpect(status().isUnauthorized());
    }

    @Test void secondLogoutDoesNotFail() throws Exception {
        TokenPair tokens = loginTokenPair();
        logout(tokens.refreshToken(), tokens.accessToken()).andExpect(status().isNoContent());
        logout(tokens.refreshToken(), tokens.accessToken()).andExpect(status().isNoContent());
    }

    @Test void logoutWithoutAccessTokenReturnsStandardUnauthorizedResponse() throws Exception {
        logout("opaque-refresh-token", null)
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.code").value("UNAUTHORIZED"))
                .andExpect(jsonPath("$.fieldErrors").isArray())
                .andExpect(jsonPath("$.traceId").isNotEmpty())
                .andExpect(jsonPath("$.timestamp").isNotEmpty());
    }

    @Test void healthEndpointIsPublic() throws Exception {
        mockMvc.perform(get("/actuator/health")).andExpect(status().isOk());
    }

    @Test void protectedEndpointWithoutTokenReturnsUnauthorized() throws Exception {
        mockMvc.perform(get("/actuator/info")).andExpect(status().isUnauthorized());
    }

    @Test void responsesDoNotExposeCredentialOrTokenHashes() throws Exception {
        MvcResult result = login(registeredUser("CANDIDATE"), PASSWORD).andReturn();
        JsonNode response = objectMapper.readTree(result.getResponse().getContentAsString());
        assertThat(response.findValue("password")).isNull();
        assertThat(response.findValue("passwordHash")).isNull();
        assertThat(response.findValue("tokenHash")).isNull();
    }

    @Test void errorResponseContainsStandardMetadata() throws Exception {
        login(uniqueEmail(), PASSWORD).andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value("INVALID_CREDENTIALS"))
                .andExpect(jsonPath("$.message").isNotEmpty())
                .andExpect(jsonPath("$.traceId").isNotEmpty())
                .andExpect(jsonPath("$.timestamp").isNotEmpty());
    }

    @Test void flywayMigrationWasApplied() {
        Integer count = jdbcTemplate.queryForObject(
                "select count(*) from flyway_schema_history where version = '1' and success = true", Integer.class);
        assertThat(count).isEqualTo(1);
    }

    private String registeredUser(String role) throws Exception {
        String email = uniqueEmail();
        register(email, role).andExpect(status().isCreated());
        return email;
    }

    private void assertStatusCannotLogin(String accountStatus, int httpStatus, String code) throws Exception {
        String email = registeredUser("CANDIDATE");
        jdbcTemplate.update("update users set status = ? where email = ?", accountStatus, email);
        login(email, PASSWORD).andExpect(status().is(httpStatus)).andExpect(jsonPath("$.code").value(code));
    }

    private String loginRefreshToken() throws Exception {
        return data(login(registeredUser("CANDIDATE"), PASSWORD).andReturn()).get("refreshToken").asText();
    }

    private TokenPair loginTokenPair() throws Exception {
        JsonNode data = data(login(registeredUser("CANDIDATE"), PASSWORD).andReturn());
        return new TokenPair(data.get("accessToken").asText(), data.get("refreshToken").asText());
    }

    private JsonNode data(MvcResult result) throws Exception {
        return objectMapper.readTree(result.getResponse().getContentAsString()).get("data");
    }

    private org.springframework.test.web.servlet.ResultActions register(String email, String role) throws Exception {
        return mockMvc.perform(post("/api/v1/auth/register").contentType(MediaType.APPLICATION_JSON)
                .content("{\"email\":\"%s\",\"password\":\"%s\",\"role\":\"%s\"}"
                        .formatted(email, PASSWORD, role)));
    }

    private org.springframework.test.web.servlet.ResultActions login(String email, String password) throws Exception {
        return mockMvc.perform(post("/api/v1/auth/login").contentType(MediaType.APPLICATION_JSON)
                .content("{\"email\":\"%s\",\"password\":\"%s\"}".formatted(email, password)));
    }

    private org.springframework.test.web.servlet.ResultActions refresh(String token) throws Exception {
        return mockMvc.perform(post("/api/v1/auth/refresh").contentType(MediaType.APPLICATION_JSON)
                .content("{\"refreshToken\":\"%s\"}".formatted(token)));
    }

    private org.springframework.test.web.servlet.ResultActions logout(String token, String accessToken) throws Exception {
        var request = post("/api/v1/auth/logout").contentType(MediaType.APPLICATION_JSON)
                .content("{\"refreshToken\":\"%s\"}".formatted(token));
        if (accessToken != null) {
            request.header("Authorization", "Bearer " + accessToken);
        }
        return mockMvc.perform(request);
    }

    private String uniqueEmail() {
        return UUID.randomUUID() + "@example.com";
    }

    private record TokenPair(String accessToken, String refreshToken) {}
}

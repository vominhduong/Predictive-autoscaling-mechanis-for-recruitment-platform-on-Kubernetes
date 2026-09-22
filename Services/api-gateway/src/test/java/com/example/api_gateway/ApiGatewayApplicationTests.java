package com.example.api_gateway;

import com.nimbusds.jose.jwk.JWKSet;
import com.nimbusds.jose.jwk.RSAKey;
import com.nimbusds.jose.jwk.source.ImmutableJWKSet;
import com.nimbusds.jose.proc.SecurityContext;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.cloud.gateway.route.RouteDefinitionLocator;
import org.springframework.context.ApplicationContext;
import org.springframework.core.io.ClassPathResource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.security.converter.RsaKeyConverters;
import org.springframework.security.oauth2.jose.jws.SignatureAlgorithm;
import org.springframework.security.oauth2.jwt.JwtClaimsSet;
import org.springframework.security.oauth2.jwt.JwtEncoderParameters;
import org.springframework.security.oauth2.jwt.JwsHeader;
import org.springframework.security.oauth2.jwt.NimbusJwtEncoder;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.web.reactive.server.WebTestClient;
import reactor.core.publisher.Mono;
import reactor.netty.DisposableServer;
import reactor.netty.http.server.HttpServer;

import java.security.interfaces.RSAPrivateKey;
import java.security.interfaces.RSAPublicKey;
import java.io.IOException;
import java.net.ServerSocket;
import java.time.Duration;
import java.time.Instant;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
class ApiGatewayApplicationTests {
    private static final DisposableServer UPSTREAM = startUpstream();
    private static final int UNAVAILABLE_PORT = reserveClosedPort();
    private static final String EMAIL = "candidate@example.com";
    private static final String ROLE = "CANDIDATE";

    @LocalServerPort private int port;
    @Autowired private ApplicationContext applicationContext;
    @Autowired private RouteDefinitionLocator routeDefinitionLocator;

    @DynamicPropertySource
    static void properties(DynamicPropertyRegistry registry) {
        String upstream = "http://localhost:" + UPSTREAM.port();
        registry.add("AUTH_SERVICE_URI", () -> upstream);
        registry.add("USER_SERVICE_URI", () -> upstream);
        registry.add("JOB_SERVICE_URI", () -> upstream);
        registry.add("APPLICATION_SERVICE_URI", () -> "http://127.0.0.1:" + UNAVAILABLE_PORT);
        registry.add("JWT_PUBLIC_KEY", () -> "classpath:keys/test-public.pem");
        registry.add("spring.cloud.gateway.server.webflux.httpclient.response-timeout", () -> "250ms");
    }

    @AfterAll
    static void stopUpstream() {
        UPSTREAM.disposeNow();
    }

    @Test
    void runsAsReactiveGatewayWithExpectedRoutes() {
        assertThat(applicationContext.getClass().getSimpleName()).contains("Reactive");
        assertThat(applicationContext.containsBean("dispatcherServlet")).isFalse();
        Set<String> routeIds = routeDefinitionLocator.getRouteDefinitions().map(route -> route.getId())
                .collect(Collectors.toSet()).block(Duration.ofSeconds(5));
        assertThat(routeIds).containsExactlyInAnyOrder(
                "auth-service", "user-candidates", "user-companies", "application-employer",
                "application-service", "job-employer", "job-service",
                "job-admin-categories", "job-admin-locations");
    }

    @Test
    void publicAuthRoutePreservesMethodPathAndBody() {
        String body = "{\"email\":\"candidate@example.com\"}";
        client().post().uri("/api/v1/auth/register").contentType(org.springframework.http.MediaType.APPLICATION_JSON)
                .bodyValue(body).exchange().expectStatus().isOk()
                .expectHeader().valueEquals("Echo-Method", "POST")
                .expectHeader().valueEquals("Echo-Path", "/api/v1/auth/register")
                .expectBody(String.class).isEqualTo(body);
    }

    @Test
    void publicRequestCannotForwardSpoofedIdentityHeaders() {
        client().post().uri("/api/v1/auth/login")
                .header("X-User-Id", "spoofed-id")
                .header("X-User-Email", "attacker@example.com")
                .header("X-User-Role", "ADMIN")
                .bodyValue("{}").exchange().expectStatus().isOk()
                .expectHeader().doesNotExist("Echo-X-User-Id")
                .expectHeader().doesNotExist("Echo-X-User-Email")
                .expectHeader().doesNotExist("Echo-X-User-Role");
    }

    @Test
    void protectedRouteWithoutTokenReturnsStandardUnauthorized() {
        client().get().uri("/api/v1/candidates/me").exchange()
                .expectStatus().isUnauthorized()
                .expectHeader().exists("X-Correlation-ID")
                .expectBody().jsonPath("$.success").isEqualTo(false)
                .jsonPath("$.code").isEqualTo("UNAUTHORIZED")
                .jsonPath("$.traceId").isNotEmpty();
    }

    @Test
    void validJwtAddsVerifiedIdentityAndReplacesSpoofedHeaders() throws Exception {
        UUID userId = UUID.randomUUID();
        client().get().uri("/api/v1/candidates/me")
                .header(HttpHeaders.AUTHORIZATION, "Bearer " + token(userId, Instant.now(), Duration.ofMinutes(30)))
                .header("X-User-Id", "spoofed-id").header("X-User-Email", "attacker@example.com")
                .header("X-User-Role", "ADMIN").exchange().expectStatus().isOk()
                .expectHeader().valueEquals("Echo-X-User-Id", userId.toString())
                .expectHeader().valueEquals("Echo-X-User-Email", EMAIL)
                .expectHeader().valueEquals("Echo-X-User-Role", ROLE);
    }

    @Test
    void tamperedJwtIsRejected() throws Exception {
        String valid = token(UUID.randomUUID(), Instant.now(), Duration.ofMinutes(30));
        String[] parts = valid.split("\\.");
        parts[1] = (parts[1].charAt(0) == 'A' ? "B" : "A") + parts[1].substring(1);
        client().get().uri("/api/v1/candidates/me")
                .header(HttpHeaders.AUTHORIZATION, "Bearer " + String.join(".", parts))
                .exchange().expectStatus().isUnauthorized()
                .expectBody().jsonPath("$.code").isEqualTo("UNAUTHORIZED");
    }

    @Test
    void expiredJwtIsRejected() throws Exception {
        client().get().uri("/api/v1/candidates/me")
                .header(HttpHeaders.AUTHORIZATION,
                        "Bearer " + token(UUID.randomUUID(), Instant.now().minusSeconds(3600), Duration.ofMinutes(5)))
                .exchange().expectStatus().isUnauthorized()
                .expectBody().jsonPath("$.code").isEqualTo("UNAUTHORIZED");
    }

    @Test
    void internalEndpointIsNeverRouted() throws Exception {
        client().get().uri("/internal/cvs/123/validation")
                .header(HttpHeaders.AUTHORIZATION, "Bearer " + token(
                        UUID.randomUUID(), Instant.now(), Duration.ofMinutes(30)))
                .exchange().expectStatus().isNotFound()
                .expectBody().jsonPath("$.code").isEqualTo("ROUTE_NOT_FOUND");
    }

    @Test
    void validCorrelationIdIsForwardedAndReturned() {
        client().get().uri("/api/v1/jobs").header("X-Correlation-ID", "request-123")
                .exchange().expectStatus().isOk()
                .expectHeader().valueEquals("X-Correlation-ID", "request-123")
                .expectHeader().valueEquals("Echo-X-Correlation-ID", "request-123");
    }

    @Test
    void invalidCorrelationIdIsReplacedWithUuid() {
        client().get().uri("/api/v1/jobs").header("X-Correlation-ID", "invalid id with spaces")
                .exchange().expectStatus().isOk()
                .expectHeader().value("X-Correlation-ID", value -> assertThat(UUID.fromString(value)).isNotNull())
                .expectHeader().value("Echo-X-Correlation-ID", value -> assertThat(UUID.fromString(value)).isNotNull());
    }

    @Test
    void corsPreflightAllowsConfiguredLocalOrigin() {
        client().options().uri("/api/v1/auth/login")
                .header(HttpHeaders.ORIGIN, "http://localhost:5173")
                .header(HttpHeaders.ACCESS_CONTROL_REQUEST_METHOD, "POST")
                .header(HttpHeaders.ACCESS_CONTROL_REQUEST_HEADERS, "content-type,authorization")
                .exchange().expectStatus().isOk()
                .expectHeader().valueEquals(HttpHeaders.ACCESS_CONTROL_ALLOW_ORIGIN, "http://localhost:5173")
                .expectHeader().valueEquals(HttpHeaders.ACCESS_CONTROL_ALLOW_CREDENTIALS, "true");
    }

    @Test
    void unavailableUpstreamReturnsServiceUnavailable() throws Exception {
        client().get().uri("/api/v1/applications/me")
                .header(HttpHeaders.AUTHORIZATION, "Bearer " + token(
                        UUID.randomUUID(), Instant.now(), Duration.ofMinutes(30)))
                .exchange().expectStatus().isEqualTo(HttpStatus.SERVICE_UNAVAILABLE)
                .expectBody().jsonPath("$.code").isEqualTo("DEPENDENCY_UNAVAILABLE");
    }

    @Test
    void slowUpstreamReturnsGatewayTimeout() throws Exception {
        client().get().uri("/api/v1/candidates/slow")
                .header(HttpHeaders.AUTHORIZATION, "Bearer " + token(
                        UUID.randomUUID(), Instant.now(), Duration.ofMinutes(30)))
                .exchange().expectStatus().isEqualTo(HttpStatus.GATEWAY_TIMEOUT)
                .expectBody().jsonPath("$.code").isEqualTo("DEPENDENCY_TIMEOUT");
    }

    private WebTestClient client() {
        return WebTestClient.bindToServer().baseUrl("http://localhost:" + port)
                .responseTimeout(Duration.ofSeconds(5)).build();
    }

    private String token(UUID userId, Instant issuedAt, Duration lifetime) throws Exception {
        RSAPublicKey publicKey = (RSAPublicKey) RsaKeyConverters.x509()
                .convert(new ClassPathResource("keys/test-public.pem").getInputStream());
        RSAPrivateKey privateKey = (RSAPrivateKey) RsaKeyConverters.pkcs8()
                .convert(new ClassPathResource("keys/test-private.pem").getInputStream());
        RSAKey rsaKey = new RSAKey.Builder(publicKey).privateKey(privateKey).build();
        NimbusJwtEncoder encoder = new NimbusJwtEncoder(new ImmutableJWKSet<SecurityContext>(new JWKSet(rsaKey)));
        JwtClaimsSet claims = JwtClaimsSet.builder().issuer("recruitment-auth-service")
                .subject(userId.toString()).issuedAt(issuedAt).expiresAt(issuedAt.plus(lifetime))
                .id(UUID.randomUUID().toString()).claim("email", EMAIL).claim("role", ROLE).build();
        return encoder.encode(JwtEncoderParameters.from(
                JwsHeader.with(SignatureAlgorithm.RS256).build(), claims)).getTokenValue();
    }

    private static DisposableServer startUpstream() {
        return HttpServer.create().port(0).handle((request, response) -> {
            response.status(200).header("Echo-Method", request.method().name())
                    .header("Echo-Path", request.uri().split("\\?", 2)[0]);
            copyHeader(request.requestHeaders().get("X-Correlation-ID"), response, "Echo-X-Correlation-ID");
            copyHeader(request.requestHeaders().get("X-User-Id"), response, "Echo-X-User-Id");
            copyHeader(request.requestHeaders().get("X-User-Email"), response, "Echo-X-User-Email");
            copyHeader(request.requestHeaders().get("X-User-Role"), response, "Echo-X-User-Role");
            if (request.uri().contains("/slow")) {
                return response.sendString(Mono.delay(Duration.ofSeconds(2)).map(ignored -> "slow"));
            }
            return response.send(request.receive().retain());
        }).bindNow();
    }

    private static void copyHeader(String value, reactor.netty.http.server.HttpServerResponse response,
                                   String targetName) {
        if (value != null) response.header(targetName, value);
    }

    private static int reserveClosedPort() {
        try (ServerSocket socket = new ServerSocket(0)) {
            return socket.getLocalPort();
        } catch (IOException exception) {
            throw new IllegalStateException("Cannot reserve a test port", exception);
        }
    }
}

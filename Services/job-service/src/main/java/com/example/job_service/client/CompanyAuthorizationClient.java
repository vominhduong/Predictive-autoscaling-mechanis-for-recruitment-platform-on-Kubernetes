package com.example.job_service.client;

import com.example.job_service.exception.*;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.http.client.JdkClientHttpRequestFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.client.*;

import java.net.http.HttpClient;
import java.time.Duration;
import java.util.UUID;

@Component
public class CompanyAuthorizationClient {
    private final RestClient client;
    private final String token;

    public CompanyAuthorizationClient(@Value("${job-service.user-service.base-url}") String baseUrl,
                                      @Value("${job-service.user-service.connect-timeout}") Duration connectTimeout,
                                      @Value("${job-service.user-service.read-timeout}") Duration readTimeout,
                                      @Value("${job-service.internal-token}") String token) {
        HttpClient http = HttpClient.newBuilder().connectTimeout(connectTimeout).build();
        JdkClientHttpRequestFactory factory = new JdkClientHttpRequestFactory(http);
        factory.setReadTimeout(readTimeout);
        this.client = RestClient.builder().baseUrl(baseUrl).requestFactory(factory).build();
        this.token = token;
    }

    public void requireManage(UUID companyId, UUID userId, String correlationId) {
        try {
            Envelope response = client.get().uri(uri -> uri.path("/internal/companies/{id}/authorization")
                            .queryParam("userId", userId).build(companyId))
                    .header("X-Internal-Token", token).header("X-Correlation-ID", correlationId)
                    .retrieve().body(Envelope.class);
            if (response == null || !response.success || response.data == null)
                throw unavailable("User Service returned an invalid authorization response");
            if (!response.data.canManage)
                throw new ApiException(HttpStatus.FORBIDDEN, "COMPANY_ACCESS_DENIED",
                        "You cannot manage this company");
        } catch (HttpClientErrorException.NotFound exception) {
            throw new ApiException(HttpStatus.NOT_FOUND, "COMPANY_NOT_FOUND", "Company was not found");
        } catch (HttpClientErrorException.Unauthorized exception) {
            throw unavailable("User Service rejected the service credential");
        } catch (ResourceAccessException exception) {
            if (exception.getCause() instanceof java.net.http.HttpTimeoutException)
                throw new ApiException(HttpStatus.SERVICE_UNAVAILABLE, "UPSTREAM_SERVICE_TIMEOUT",
                        "User Service timed out");
            throw unavailable("User Service is unavailable");
        } catch (RestClientResponseException exception) {
            throw unavailable("User Service is unavailable");
        }
    }

    private ApiException unavailable(String message) {
        return new ApiException(HttpStatus.SERVICE_UNAVAILABLE, "UPSTREAM_SERVICE_UNAVAILABLE", message);
    }

    public static class Envelope { public boolean success; public Authorization data; }
    public static class Authorization { public boolean canManage; public String memberRole; }
}

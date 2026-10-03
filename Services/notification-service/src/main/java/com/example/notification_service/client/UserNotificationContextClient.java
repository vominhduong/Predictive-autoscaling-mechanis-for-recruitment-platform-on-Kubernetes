package com.example.notification_service.client;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.client.JdkClientHttpRequestFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

import java.net.http.HttpClient;
import java.time.Duration;
import java.util.UUID;

@Component
public class UserNotificationContextClient {
    private final RestClient users;
    private final String internalToken;

    public UserNotificationContextClient(@Value("${notification.user-service-url}") String baseUrl,
                                         @Value("${notification.internal-token}") String internalToken,
                                         @Value("${notification.user-service-connect-timeout}") Duration connectTimeout,
                                         @Value("${notification.user-service-read-timeout}") Duration readTimeout) {
        var factory = new JdkClientHttpRequestFactory(HttpClient.newBuilder().connectTimeout(connectTimeout).build());
        factory.setReadTimeout(readTimeout);
        users = RestClient.builder().baseUrl(baseUrl).requestFactory(factory).build();
        this.internalToken = internalToken;
    }

    public NotificationContext get(UUID candidateId, UUID companyId) {
        var response = users.get().uri(uri -> uri.path("/internal/notification-context")
                        .queryParam("candidateId", candidateId).queryParam("companyId", companyId).build())
                .header("X-Internal-Token", internalToken).retrieve().body(ContextEnvelope.class);
        if (response == null || !response.success || response.data == null
                || response.data.companyName() == null || response.data.companyName().isBlank()) {
            throw new IllegalStateException("Notification context unavailable");
        }
        return response.data;
    }

    public record NotificationContext(String candidateName, String companyName) {
    }

    public static class ContextEnvelope {
        public boolean success;
        public NotificationContext data;
    }
}

package com.example.notification_service.client;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.http.client.JdkClientHttpRequestFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

import java.net.http.HttpClient;
import java.time.Duration;
import java.util.List;

@Component
public class BrevoEmailSender {
    private final RestClient client;
    private final String apiKey;
    private final Address sender;

    public BrevoEmailSender(@Value("${notification.brevo.url}") String url,
                            @Value("${notification.brevo.api-key}") String apiKey,
                            @Value("${notification.brevo.sender-email}") String senderEmail,
                            @Value("${notification.brevo.sender-name}") String senderName,
                            @Value("${notification.brevo.connect-timeout}") Duration connectTimeout,
                            @Value("${notification.brevo.read-timeout}") Duration readTimeout) {
        var factory = new JdkClientHttpRequestFactory(HttpClient.newBuilder().connectTimeout(connectTimeout).build());
        factory.setReadTimeout(readTimeout);
        client = RestClient.builder().requestFactory(factory).build();
        this.apiKey = apiKey;
        sender = new Address(senderEmail, senderName);
        this.url = url;
    }

    private final String url;

    public void send(String recipientEmail, String recipientName, String subject, String textContent) {
        if (apiKey.isBlank() || sender.email().isBlank())
            throw new IllegalStateException("Brevo sender configuration is incomplete");
        var response = client.post().uri(url).header("api-key", apiKey)
                .contentType(MediaType.APPLICATION_JSON)
                .body(new EmailRequest(sender, List.of(new Address(recipientEmail, recipientName)), subject, textContent))
                .retrieve().toBodilessEntity();
        if (response.getStatusCode().value() != 201)
            throw new IllegalStateException("Brevo did not accept the email");
    }

    private record Address(String email, String name) {
    }

    private record EmailRequest(Address sender, List<Address> to, String subject, String textContent) {
    }
}

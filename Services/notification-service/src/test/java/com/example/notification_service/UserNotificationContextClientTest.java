package com.example.notification_service;

import com.example.notification_service.client.UserNotificationContextClient;
import com.sun.net.httpserver.HttpServer;
import org.junit.jupiter.api.Test;

import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.UUID;
import java.util.concurrent.atomic.AtomicReference;

import static org.assertj.core.api.Assertions.*;

class UserNotificationContextClientTest {
    @Test
    void readsCandidateAndCompanyNamesUsingThePrivateUserApi() throws Exception {
        UUID candidate = UUID.randomUUID(), company = UUID.randomUUID();
        var requested = new AtomicReference<String>();
        var token = new AtomicReference<String>();
        HttpServer server = HttpServer.create(new InetSocketAddress("127.0.0.1", 0), 0);
        server.createContext("/internal/notification-context", exchange -> {
            requested.set(exchange.getRequestURI().toString());
            token.set(exchange.getRequestHeaders().getFirst("X-Internal-Token"));
            byte[] response = "{\"success\":true,\"data\":{\"candidateName\":\"Nguyễn An\",\"companyName\":\"Sao Việt\"}}"
                    .getBytes(StandardCharsets.UTF_8);
            exchange.getResponseHeaders().set("Content-Type", "application/json");
            exchange.sendResponseHeaders(200, response.length);
            exchange.getResponseBody().write(response);
            exchange.close();
        });
        server.start();
        try {
            var client = new UserNotificationContextClient("http://127.0.0.1:" + server.getAddress().getPort(),
                    "test-internal-token", Duration.ofSeconds(1), Duration.ofSeconds(1));
            var context = client.get(candidate, company);
            assertThat(context.candidateName()).isEqualTo("Nguyễn An");
            assertThat(context.companyName()).isEqualTo("Sao Việt");
            assertThat(requested.get()).contains("candidateId=" + candidate, "companyId=" + company);
            assertThat(token).hasValue("test-internal-token");
        } finally {
            server.stop(0);
        }
    }
}

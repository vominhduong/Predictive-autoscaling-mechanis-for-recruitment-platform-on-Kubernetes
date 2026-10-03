package com.example.notification_service;

import com.example.notification_service.client.BrevoEmailSender;
import com.sun.net.httpserver.HttpServer;
import org.junit.jupiter.api.Test;
import tools.jackson.databind.json.JsonMapper;

import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.concurrent.atomic.AtomicReference;

import static org.assertj.core.api.Assertions.*;

class BrevoEmailSenderTest {
    @Test
    void sendsExactlyOnePlainTextRequestWithConfiguredHeaderAndSender() throws Exception {
        var count = new AtomicInteger();
        var key = new AtomicReference<String>();
        var body = new AtomicReference<String>();
        var contentType = new AtomicReference<String>();
        HttpServer server = HttpServer.create(new InetSocketAddress("127.0.0.1", 0), 0);
        server.createContext("/v3/smtp/email", exchange -> {
            count.incrementAndGet();
            key.set(exchange.getRequestHeaders().getFirst("api-key"));
            contentType.set(exchange.getRequestHeaders().getFirst("Content-Type"));
            body.set(new String(exchange.getRequestBody().readAllBytes(), StandardCharsets.UTF_8));
            exchange.sendResponseHeaders(201, -1);
            exchange.close();
        });
        server.start();
        try {
            sender(server, Duration.ofSeconds(1)).send("candidate@example.com", "Nguyễn An",
                    "Xác nhận ứng tuyển", "Hồ sơ đã được nhận");
            assertThat(count).hasValue(1);
            assertThat(key).hasValue("test-key");
            assertThat(contentType.get()).startsWith("application/json");
            var json = JsonMapper.builder().build().readTree(body.get());
            assertThat(json.get("sender").get("email").asText()).isEqualTo("sender@example.com");
            assertThat(json.get("sender").get("name").asText()).isEqualTo("Recruitment Platform");
            assertThat(json.get("to").get(0).get("email").asText()).isEqualTo("candidate@example.com");
            assertThat(json.get("to").get(0).get("name").asText()).isEqualTo("Nguyễn An");
            assertThat(json.get("subject").asText()).isEqualTo("Xác nhận ứng tuyển");
            assertThat(json.get("textContent").asText()).isEqualTo("Hồ sơ đã được nhận");
            assertThat(json.has("htmlContent")).isFalse();
        } finally {
            server.stop(0);
        }
    }

    @Test
    void serverFailureAndTimeoutNeverRetry() throws Exception {
        var count = new AtomicInteger();
        HttpServer server = HttpServer.create(new InetSocketAddress("127.0.0.1", 0), 0);
        server.createContext("/v3/smtp/email", exchange -> {
            count.incrementAndGet();
            exchange.sendResponseHeaders(503, -1);
            exchange.close();
        });
        server.start();
        try {
            assertThatThrownBy(() -> sender(server, Duration.ofSeconds(1)).send(
                    "candidate@example.com", "Candidate", "Subject", "Text")).isInstanceOf(RuntimeException.class);
            assertThat(count).hasValue(1);
        } finally {
            server.stop(0);
        }

        count.set(0);
        HttpServer slow = HttpServer.create(new InetSocketAddress("127.0.0.1", 0), 0);
        slow.createContext("/v3/smtp/email", exchange -> {
            count.incrementAndGet();
            try {
                Thread.sleep(300);
                exchange.sendResponseHeaders(201, -1);
            } catch (Exception ignored) {
                // The caller timed out and closed the connection.
            } finally {
                exchange.close();
            }
        });
        slow.start();
        try {
            assertThatThrownBy(() -> sender(slow, Duration.ofMillis(50)).send(
                    "candidate@example.com", "Candidate", "Subject", "Text")).isInstanceOf(RuntimeException.class);
            assertThat(count).hasValue(1);
        } finally {
            slow.stop(0);
        }
    }

    private BrevoEmailSender sender(HttpServer server, Duration readTimeout) {
        return new BrevoEmailSender("http://127.0.0.1:" + server.getAddress().getPort() + "/v3/smtp/email",
                "test-key", "sender@example.com", "Recruitment Platform", Duration.ofSeconds(1), readTimeout);
    }
}

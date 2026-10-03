package com.example.user_service;

import com.example.user_service.exception.ApiException;
import com.example.user_service.storage.MinioObjectStorage;
import org.junit.jupiter.api.Test;
import org.testcontainers.containers.GenericContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import org.testcontainers.containers.wait.strategy.Wait;

import java.io.ByteArrayInputStream;
import java.net.URI;
import java.net.http.*;
import java.util.Objects;

import static org.assertj.core.api.Assertions.*;

@Testcontainers
class MinioCvStorageTest {
    @Container
    static final GenericContainer<?> MINIO = new GenericContainer<>("quay.io/minio/minio:RELEASE.2025-04-22T22-12-26Z")
            .withEnv("MINIO_ROOT_USER", "test-access")
            .withEnv("MINIO_ROOT_PASSWORD", "test-secret-password")
            .withCommand("server", "/data").withExposedPorts(9000)
            .waitingFor(Wait.forHttp("/minio/health/ready").forPort(9000));

    @Test
    void actualPdfRoundTripPrivateBucketAndMissingFile() throws Exception {
        String endpoint = "http://" + MINIO.getHost() + ":" + MINIO.getMappedPort(9000);
        var storage = new MinioObjectStorage(endpoint, "test-access", "test-secret-password", "test-cvs");
        byte[] pdf;
        try (var in = getClass().getResourceAsStream("/cv-preview.pdf")) {
            pdf = Objects.requireNonNull(in).readAllBytes();
        }
        storage.put("cvs/original.pdf", new ByteArrayInputStream(pdf), pdf.length, "application/pdf");
        var result = storage.get("cvs/original.pdf");
        assertThat(result.bytes()).isEqualTo(pdf);
        assertThat(result.contentType()).isEqualTo("application/pdf");
        try (var http = HttpClient.newHttpClient()) {
            var response = http.send(HttpRequest.newBuilder(URI.create(endpoint + "/test-cvs/cvs/original.pdf")).GET().build(),
                    HttpResponse.BodyHandlers.discarding());
            assertThat(response.statusCode()).isEqualTo(403);
        }
        storage.delete("cvs/original.pdf");
        assertThatThrownBy(() -> storage.get("cvs/original.pdf")).isInstanceOfSatisfying(ApiException.class,
                error -> assertThat(error.code()).isEqualTo("CV_FILE_NOT_FOUND"));
    }
}

package com.example.api_gateway.error;

import com.example.api_gateway.filter.CorrelationWebFilter;
import org.springframework.core.io.buffer.DataBuffer;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ServerWebExchange;
import reactor.core.publisher.Mono;
import tools.jackson.databind.ObjectMapper;

import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Component
public class ErrorResponseWriter {
    private final ObjectMapper objectMapper;

    public ErrorResponseWriter(ObjectMapper objectMapper) {
        this.objectMapper = objectMapper;
    }

    public Mono<Void> write(ServerWebExchange exchange, HttpStatus status, String code, String message) {
        if (exchange.getResponse().isCommitted()) {
            return Mono.error(new IllegalStateException("Response already committed"));
        }
        String traceId = (String) exchange.getAttribute(CorrelationWebFilter.ATTRIBUTE);
        traceId = CorrelationWebFilter.resolve(traceId != null ? traceId
                : exchange.getRequest().getHeaders().getFirst(CorrelationWebFilter.HEADER));
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("success", false);
        body.put("code", code);
        body.put("message", message);
        body.put("fieldErrors", List.of());
        body.put("traceId", traceId);
        body.put("timestamp", Instant.now());
        byte[] bytes = objectMapper.writeValueAsBytes(body);
        exchange.getResponse().setStatusCode(status);
        exchange.getResponse().getHeaders().setContentType(MediaType.APPLICATION_JSON);
        exchange.getResponse().getHeaders().set(CorrelationWebFilter.HEADER, traceId);
        DataBuffer buffer = exchange.getResponse().bufferFactory().wrap(bytes);
        return exchange.getResponse().writeWith(Mono.just(buffer));
    }
}

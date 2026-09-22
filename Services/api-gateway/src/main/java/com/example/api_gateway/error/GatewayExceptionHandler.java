package com.example.api_gateway.error;

import io.netty.channel.ConnectTimeoutException;
import io.netty.handler.timeout.ReadTimeoutException;
import org.springframework.core.annotation.Order;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.web.server.ServerWebExchange;
import org.springframework.web.server.WebExceptionHandler;
import reactor.core.publisher.Mono;

import java.net.ConnectException;
import java.util.concurrent.TimeoutException;

@Component
@Order(-2)
public class GatewayExceptionHandler implements WebExceptionHandler {
    private final ErrorResponseWriter writer;

    public GatewayExceptionHandler(ErrorResponseWriter writer) {
        this.writer = writer;
    }

    @Override
    public Mono<Void> handle(ServerWebExchange exchange, Throwable exception) {
        if (exception instanceof ResponseStatusException statusException) {
            int status = statusException.getStatusCode().value();
            if (status == 504) {
                return writer.write(exchange, HttpStatus.GATEWAY_TIMEOUT,
                        "DEPENDENCY_TIMEOUT", "Upstream service timed out");
            }
            if (status == 503) {
                return writer.write(exchange, HttpStatus.SERVICE_UNAVAILABLE,
                        "DEPENDENCY_UNAVAILABLE", "Upstream service is unavailable");
            }
            if (status == 404) {
                return writer.write(exchange, HttpStatus.NOT_FOUND,
                        "ROUTE_NOT_FOUND", "No route was found for this request");
            }
        }
        if (hasCause(exception, ReadTimeoutException.class)
                || hasCause(exception, TimeoutException.class)
                || hasCauseNamed(exception, "ResponseTimeoutException")) {
            return writer.write(exchange, HttpStatus.GATEWAY_TIMEOUT,
                    "DEPENDENCY_TIMEOUT", "Upstream service timed out");
        }
        if (hasCause(exception, ConnectException.class)
                || hasCause(exception, ConnectTimeoutException.class)
                || hasCauseNamed(exception, "AnnotatedConnectException")) {
            return writer.write(exchange, HttpStatus.SERVICE_UNAVAILABLE,
                    "DEPENDENCY_UNAVAILABLE", "Upstream service is unavailable");
        }
        return writer.write(exchange, HttpStatus.INTERNAL_SERVER_ERROR,
                "INTERNAL_SERVER_ERROR", "An unexpected error occurred");
    }

    private boolean hasCause(Throwable exception, Class<? extends Throwable> type) {
        Throwable current = exception;
        while (current != null) {
            if (type.isInstance(current)) return true;
            current = current.getCause();
        }
        return false;
    }

    private boolean hasCauseNamed(Throwable exception, String simpleName) {
        Throwable current = exception;
        while (current != null) {
            if (current.getClass().getSimpleName().equals(simpleName)) return true;
            current = current.getCause();
        }
        return false;
    }
}

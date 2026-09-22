package com.example.api_gateway.filter;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ServerWebExchange;
import org.springframework.web.server.WebFilter;
import org.springframework.web.server.WebFilterChain;
import reactor.core.publisher.Mono;

import java.util.UUID;
import java.util.regex.Pattern;

@Component
@Order(Ordered.HIGHEST_PRECEDENCE)
public class CorrelationWebFilter implements WebFilter {
    public static final String HEADER = "X-Correlation-ID";
    public static final String ATTRIBUTE = CorrelationWebFilter.class.getName() + ".id";
    private static final Pattern VALID_ID = Pattern.compile("[A-Za-z0-9._-]{1,128}");
    private static final Logger log = LoggerFactory.getLogger(CorrelationWebFilter.class);

    @Override
    public Mono<Void> filter(ServerWebExchange exchange, WebFilterChain chain) {
        String correlationId = resolve(exchange.getRequest().getHeaders().getFirst(HEADER));
        long startedAt = System.nanoTime();
        exchange.getAttributes().put(ATTRIBUTE, correlationId);
        exchange.getResponse().getHeaders().set(HEADER, correlationId);
        ServerWebExchange mutated = exchange.mutate().request(request -> request.headers(headers ->
                headers.set(HEADER, correlationId))).build();
        return chain.filter(mutated).doFinally(signal -> {
            int status = mutated.getResponse().getStatusCode() == null
                    ? 0 : mutated.getResponse().getStatusCode().value();
            long durationMs = (System.nanoTime() - startedAt) / 1_000_000;
            log.info("request method={} path={} status={} durationMs={} correlationId={}",
                    mutated.getRequest().getMethod(), mutated.getRequest().getPath().value(),
                    status, durationMs, correlationId);
        });
    }

    public static String resolve(String candidate) {
        return candidate != null && VALID_ID.matcher(candidate).matches()
                ? candidate : UUID.randomUUID().toString();
    }
}

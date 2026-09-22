package com.example.api_gateway.filter;

import org.springframework.cloud.gateway.filter.GatewayFilterChain;
import org.springframework.cloud.gateway.filter.GlobalFilter;
import org.springframework.core.Ordered;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ServerWebExchange;
import reactor.core.publisher.Mono;

import java.util.List;

@Component
public class IdentityHeaderFilter implements GlobalFilter, Ordered {
    private static final List<String> IDENTITY_HEADERS = List.of(
            "X-User-Id", "X-User-Email", "X-User-Role");

    @Override
    public Mono<Void> filter(ServerWebExchange exchange, GatewayFilterChain chain) {
        return exchange.getPrincipal().defaultIfEmpty(AnonymousPrincipal.INSTANCE)
                .flatMap(principal -> {
                    ServerWebExchange secured = exchange.mutate().request(request -> request.headers(headers -> {
                        IDENTITY_HEADERS.forEach(headers::remove);
                        if (principal instanceof JwtAuthenticationToken authentication) {
                            headers.set("X-User-Id", authentication.getToken().getSubject());
                            headers.set("X-User-Email", authentication.getToken().getClaimAsString("email"));
                            headers.set("X-User-Role", authentication.getToken().getClaimAsString("role"));
                        }
                    })).build();
                    return chain.filter(secured);
                });
    }

    @Override
    public int getOrder() {
        return -100;
    }

    private enum AnonymousPrincipal implements java.security.Principal {
        INSTANCE;
        @Override public String getName() { return "anonymous"; }
    }
}

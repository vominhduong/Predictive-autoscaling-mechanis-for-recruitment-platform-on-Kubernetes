package com.example.job_service.configuration;

import com.example.job_service.security.IdentityArgumentResolver;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.method.support.HandlerMethodArgumentResolver;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

import java.util.List;

@Configuration
public class WebConfiguration implements WebMvcConfigurer {
    private final IdentityArgumentResolver identity;
    public WebConfiguration(IdentityArgumentResolver identity) { this.identity = identity; }
    @Override public void addArgumentResolvers(List<HandlerMethodArgumentResolver> resolvers) { resolvers.add(identity); }
}

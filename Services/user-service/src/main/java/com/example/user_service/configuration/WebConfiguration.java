package com.example.user_service.configuration;
import org.springframework.context.annotation.Configuration; import org.springframework.web.method.support.HandlerMethodArgumentResolver; import org.springframework.web.servlet.config.annotation.WebMvcConfigurer; import java.util.List;
@Configuration public class WebConfiguration implements WebMvcConfigurer {private final IdentityArgumentResolver resolver;public WebConfiguration(IdentityArgumentResolver r){resolver=r;}public void addArgumentResolvers(List<HandlerMethodArgumentResolver> r){r.add(resolver);}}

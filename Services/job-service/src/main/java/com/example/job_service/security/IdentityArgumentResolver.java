package com.example.job_service.security;

import com.example.job_service.exception.ApiException;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.core.MethodParameter;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.bind.support.WebDataBinderFactory;
import org.springframework.web.context.request.NativeWebRequest;
import org.springframework.web.method.support.*;

import java.util.Set;
import java.util.UUID;

@Component
public class IdentityArgumentResolver implements HandlerMethodArgumentResolver {
    private static final Set<String> ROLES = Set.of("CANDIDATE", "EMPLOYER", "ADMIN");

    @Override public boolean supportsParameter(MethodParameter parameter) {
        return parameter.getParameterType() == RequestIdentity.class;
    }

    @Override public Object resolveArgument(MethodParameter parameter, ModelAndViewContainer mav,
                                            NativeWebRequest webRequest, WebDataBinderFactory binder) {
        HttpServletRequest request = webRequest.getNativeRequest(HttpServletRequest.class);
        try {
            String role = request.getHeader("X-User-Role");
            String email = request.getHeader("X-User-Email");
            UUID id = UUID.fromString(request.getHeader("X-User-Id"));
            if (!ROLES.contains(role) || email == null || email.isBlank()) throw new IllegalArgumentException();
            return new RequestIdentity(id, email, role);
        } catch (RuntimeException exception) {
            throw new ApiException(HttpStatus.UNAUTHORIZED, "UNAUTHORIZED", "Verified gateway identity is required");
        }
    }
}

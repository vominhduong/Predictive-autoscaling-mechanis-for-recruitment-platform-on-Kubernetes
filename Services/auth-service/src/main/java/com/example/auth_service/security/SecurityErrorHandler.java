package com.example.auth_service.security;

import com.example.auth_service.common.response.ApiErrorResponse;
import com.example.auth_service.exception.ErrorCode;
import com.example.auth_service.exception.GlobalExceptionHandler;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.http.MediaType;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.web.AuthenticationEntryPoint;
import org.springframework.security.web.access.AccessDeniedHandler;
import org.springframework.stereotype.Component;
import tools.jackson.databind.ObjectMapper;

import java.io.IOException;
import java.util.List;
import java.util.UUID;

@Component
public class SecurityErrorHandler implements AuthenticationEntryPoint, AccessDeniedHandler {
    private final ObjectMapper objectMapper;

    public SecurityErrorHandler(ObjectMapper objectMapper) {
        this.objectMapper = objectMapper;
    }

    @Override
    public void commence(HttpServletRequest request, HttpServletResponse response,
                         AuthenticationException exception) throws IOException, ServletException {
        write(response, request, ErrorCode.UNAUTHORIZED);
    }

    @Override
    public void handle(HttpServletRequest request, HttpServletResponse response,
                       AccessDeniedException exception) throws IOException, ServletException {
        write(response, request, ErrorCode.ACCESS_DENIED);
    }

    private void write(HttpServletResponse response, HttpServletRequest request,
                       ErrorCode errorCode) throws IOException {
        String traceId = request.getHeader(GlobalExceptionHandler.CORRELATION_ID_HEADER);
        if (traceId == null || traceId.isBlank()) {
            traceId = UUID.randomUUID().toString();
        }
        response.setStatus(errorCode.getHttpStatus().value());
        response.setContentType(MediaType.APPLICATION_JSON_VALUE);
        response.setCharacterEncoding("UTF-8");
        response.setHeader(GlobalExceptionHandler.CORRELATION_ID_HEADER, traceId);
        objectMapper.writeValue(response.getOutputStream(), new ApiErrorResponse(
                errorCode.getBusinessCode(), errorCode.getDefaultMessage(), List.of(), traceId));
    }
}

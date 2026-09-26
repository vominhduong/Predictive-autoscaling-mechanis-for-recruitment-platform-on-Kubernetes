package com.example.job_service.exception;

import com.example.job_service.common.ApiErrorResponse;
import com.example.job_service.common.FieldErrorResponse;
import jakarta.persistence.OptimisticLockException;
import jakarta.servlet.http.HttpServletRequest;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.dao.OptimisticLockingFailureException;
import org.springframework.http.*;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.method.annotation.HandlerMethodValidationException;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;

import java.util.*;

@RestControllerAdvice
public class GlobalExceptionHandler {
    private static final Logger log = LoggerFactory.getLogger(GlobalExceptionHandler.class);

    @ExceptionHandler(ApiException.class)
    ResponseEntity<ApiErrorResponse> api(ApiException e, HttpServletRequest request) {
        return out(e.status(), e.code(), e.getMessage(), List.of(), request);
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    ResponseEntity<ApiErrorResponse> validation(MethodArgumentNotValidException e, HttpServletRequest request) {
        var fields = e.getBindingResult().getFieldErrors().stream()
                .map(f -> new FieldErrorResponse(f.getField(), f.getRejectedValue(), f.getDefaultMessage())).toList();
        return out(HttpStatus.BAD_REQUEST, "VALIDATION_ERROR", "Request validation failed", fields, request);
    }

    @ExceptionHandler({HttpMessageNotReadableException.class, HandlerMethodValidationException.class,
            MethodArgumentTypeMismatchException.class, IllegalArgumentException.class})
    ResponseEntity<ApiErrorResponse> malformed(Exception e, HttpServletRequest request) {
        return out(HttpStatus.BAD_REQUEST, "VALIDATION_ERROR", "Request validation failed", List.of(), request);
    }

    @ExceptionHandler({OptimisticLockingFailureException.class, OptimisticLockException.class})
    ResponseEntity<ApiErrorResponse> optimistic(Exception e, HttpServletRequest request) {
        return out(HttpStatus.CONFLICT, "OPTIMISTIC_LOCK_CONFLICT",
                "The job was updated by another request", List.of(), request);
    }

    @ExceptionHandler(Exception.class)
    ResponseEntity<ApiErrorResponse> unexpected(Exception e, HttpServletRequest request) {
        log.error("Unhandled job-service exception traceId={} type={}", trace(request), e.getClass().getName());
        return out(HttpStatus.INTERNAL_SERVER_ERROR, "INTERNAL_SERVER_ERROR",
                "An unexpected error occurred", List.of(), request);
    }

    private ResponseEntity<ApiErrorResponse> out(HttpStatus status, String code, String message,
                                                  List<FieldErrorResponse> fields, HttpServletRequest request) {
        String trace = trace(request);
        return ResponseEntity.status(status).header("X-Correlation-ID", trace)
                .body(new ApiErrorResponse(code, message, fields, trace));
    }

    private String trace(HttpServletRequest request) {
        Object attribute = request.getAttribute(CorrelationIdFilter.ATTRIBUTE);
        return attribute == null ? UUID.randomUUID().toString() : attribute.toString();
    }
}

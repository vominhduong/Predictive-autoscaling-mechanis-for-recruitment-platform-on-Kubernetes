package com.example.auth_service.exception;

import com.example.auth_service.common.response.ApiErrorResponse;
import com.example.auth_service.common.response.FieldErrorResponse;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.ConstraintViolation;
import jakarta.validation.ConstraintViolationException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.util.List;
import java.util.Locale;
import java.util.Set;
import java.util.UUID;

@RestControllerAdvice
public class GlobalExceptionHandler {
    public static final String CORRELATION_ID_HEADER = "X-Correlation-ID";

    private static final Logger log = LoggerFactory.getLogger(GlobalExceptionHandler.class);
    private static final Set<String> SENSITIVE_FIELDS = Set.of(
            "password", "token", "refreshtoken", "passwordhash");

    @ExceptionHandler(MethodArgumentNotValidException.class)
    ResponseEntity<ApiErrorResponse> handleMethodArgumentNotValid(
            MethodArgumentNotValidException exception, HttpServletRequest request) {
        List<FieldErrorResponse> fieldErrors = exception.getBindingResult().getFieldErrors().stream()
                .map(this::toFieldError)
                .toList();
        return response(ErrorCode.VALIDATION_ERROR, ErrorCode.VALIDATION_ERROR.getDefaultMessage(),
                fieldErrors, request);
    }

    @ExceptionHandler(ConstraintViolationException.class)
    ResponseEntity<ApiErrorResponse> handleConstraintViolation(
            ConstraintViolationException exception, HttpServletRequest request) {
        List<FieldErrorResponse> fieldErrors = exception.getConstraintViolations().stream()
                .map(this::toFieldError)
                .toList();
        return response(ErrorCode.VALIDATION_ERROR, ErrorCode.VALIDATION_ERROR.getDefaultMessage(),
                fieldErrors, request);
    }

    @ExceptionHandler(HttpMessageNotReadableException.class)
    ResponseEntity<ApiErrorResponse> handleHttpMessageNotReadable(
            HttpMessageNotReadableException exception, HttpServletRequest request) {
        return response(ErrorCode.INVALID_REQUEST, ErrorCode.INVALID_REQUEST.getDefaultMessage(),
                List.of(), request);
    }

    @ExceptionHandler(BusinessException.class)
    ResponseEntity<ApiErrorResponse> handleBusinessException(
            BusinessException exception, HttpServletRequest request) {
        return response(exception.getErrorCode(), exception.getMessage(), List.of(), request);
    }

    @ExceptionHandler(DataIntegrityViolationException.class)
    ResponseEntity<ApiErrorResponse> handleDataIntegrityViolation(
            DataIntegrityViolationException exception, HttpServletRequest request) {
        ErrorCode errorCode = isDuplicateEmail(exception)
                ? ErrorCode.EMAIL_ALREADY_EXISTS
                : ErrorCode.INVALID_REQUEST;
        return response(errorCode, errorCode.getDefaultMessage(), List.of(), request);
    }

    @ExceptionHandler(AccessDeniedException.class)
    ResponseEntity<ApiErrorResponse> handleAccessDenied(
            AccessDeniedException exception, HttpServletRequest request) {
        return response(ErrorCode.ACCESS_DENIED, ErrorCode.ACCESS_DENIED.getDefaultMessage(),
                List.of(), request);
    }

    @ExceptionHandler(Exception.class)
    ResponseEntity<ApiErrorResponse> handleUnexpectedException(
            Exception exception, HttpServletRequest request) {
        String traceId = resolveTraceId(request);
        log.error("Unhandled exception: traceId={}, exceptionType={}",
                traceId, exception.getClass().getName());
        return response(ErrorCode.INTERNAL_SERVER_ERROR,
                ErrorCode.INTERNAL_SERVER_ERROR.getDefaultMessage(), List.of(), traceId);
    }

    private FieldErrorResponse toFieldError(FieldError fieldError) {
        return new FieldErrorResponse(fieldError.getField(),
                safeRejectedValue(fieldError.getField(), fieldError.getRejectedValue()),
                fieldError.getDefaultMessage());
    }

    private FieldErrorResponse toFieldError(ConstraintViolation<?> violation) {
        String field = lastPathSegment(violation.getPropertyPath().toString());
        return new FieldErrorResponse(field, safeRejectedValue(field, violation.getInvalidValue()),
                violation.getMessage());
    }

    private Object safeRejectedValue(String field, Object rejectedValue) {
        String normalizedField = lastPathSegment(field).toLowerCase(Locale.ROOT);
        return SENSITIVE_FIELDS.contains(normalizedField) ? null : rejectedValue;
    }

    private String lastPathSegment(String path) {
        int separator = path.lastIndexOf('.');
        return separator >= 0 ? path.substring(separator + 1) : path;
    }

    private boolean isDuplicateEmail(DataIntegrityViolationException exception) {
        Throwable cause = exception.getMostSpecificCause();
        String message = cause.getMessage();
        return message != null && message.toLowerCase(Locale.ROOT).contains("uk_users_email_lower");
    }

    private ResponseEntity<ApiErrorResponse> response(
            ErrorCode errorCode, String message, List<FieldErrorResponse> fieldErrors,
            HttpServletRequest request) {
        return response(errorCode, message, fieldErrors, resolveTraceId(request));
    }

    private ResponseEntity<ApiErrorResponse> response(
            ErrorCode errorCode, String message, List<FieldErrorResponse> fieldErrors,
            String traceId) {
        ApiErrorResponse body = new ApiErrorResponse(errorCode.getBusinessCode(), message,
                fieldErrors, traceId);
        return ResponseEntity.status(errorCode.getHttpStatus())
                .header(CORRELATION_ID_HEADER, traceId)
                .body(body);
    }

    private String resolveTraceId(HttpServletRequest request) {
        String correlationId = request.getHeader(CORRELATION_ID_HEADER);
        return correlationId == null || correlationId.isBlank()
                ? UUID.randomUUID().toString()
                : correlationId;
    }
}

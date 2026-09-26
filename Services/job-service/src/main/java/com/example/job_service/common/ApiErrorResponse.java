package com.example.job_service.common;

import java.time.Instant;
import java.util.List;

public record ApiErrorResponse(boolean success, String code, String message,
                               List<FieldErrorResponse> fieldErrors, String traceId, Instant timestamp) {
    public ApiErrorResponse(String code, String message, List<FieldErrorResponse> fields, String traceId) {
        this(false, code, message, fields, traceId, Instant.now());
    }
}

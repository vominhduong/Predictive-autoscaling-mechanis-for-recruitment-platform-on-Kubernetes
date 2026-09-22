package com.example.auth_service.common.response;

import java.time.Instant;
import java.util.List;

public record ApiErrorResponse(
        boolean success,
        String code,
        String message,
        List<FieldErrorResponse> fieldErrors,
        String traceId,
        Instant timestamp
) {
    public ApiErrorResponse(String code, String message, List<FieldErrorResponse> fieldErrors,
                            String traceId) {
        this(false, code, message, List.copyOf(fieldErrors), traceId, Instant.now());
    }

    public ApiErrorResponse {
        success = false;
        fieldErrors = fieldErrors == null ? List.of() : List.copyOf(fieldErrors);
    }
}

package com.example.auth_service.common.response;

import com.fasterxml.jackson.annotation.JsonInclude;

@JsonInclude(JsonInclude.Include.NON_NULL)
public record FieldErrorResponse(
        String field,
        Object rejectedValue,
        String message
) {
}

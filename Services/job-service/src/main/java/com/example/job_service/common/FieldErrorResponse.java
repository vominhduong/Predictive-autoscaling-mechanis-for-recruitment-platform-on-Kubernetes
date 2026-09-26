package com.example.job_service.common;

public record FieldErrorResponse(String field, Object rejectedValue, String message) {}

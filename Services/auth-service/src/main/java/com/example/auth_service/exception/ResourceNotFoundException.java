package com.example.auth_service.exception;

public class ResourceNotFoundException extends BusinessException {
    public ResourceNotFoundException() {
        super(ErrorCode.USER_NOT_FOUND);
    }

    public ResourceNotFoundException(String message) {
        super(ErrorCode.USER_NOT_FOUND, message);
    }
}

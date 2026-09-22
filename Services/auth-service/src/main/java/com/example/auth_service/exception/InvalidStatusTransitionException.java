package com.example.auth_service.exception;

public class InvalidStatusTransitionException extends BusinessException {
    public InvalidStatusTransitionException() {
        super(ErrorCode.INVALID_STATUS_TRANSITION);
    }

    public InvalidStatusTransitionException(String message) {
        super(ErrorCode.INVALID_STATUS_TRANSITION, message);
    }
}

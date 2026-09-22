package com.example.user_service.common;
public record FieldErrorResponse(String field,Object rejectedValue,String message){}

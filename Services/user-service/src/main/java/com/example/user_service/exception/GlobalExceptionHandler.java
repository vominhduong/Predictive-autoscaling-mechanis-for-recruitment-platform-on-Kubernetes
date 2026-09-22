package com.example.user_service.exception;

import com.example.user_service.common.*; import jakarta.servlet.http.HttpServletRequest; import org.slf4j.*; import org.springframework.dao.DataIntegrityViolationException; import org.springframework.http.*; import org.springframework.web.bind.MethodArgumentNotValidException; import org.springframework.web.bind.annotation.*; import org.springframework.web.multipart.MaxUploadSizeExceededException; import java.util.*;

@RestControllerAdvice
public class GlobalExceptionHandler {
 private static final Logger log=LoggerFactory.getLogger(GlobalExceptionHandler.class);
 @ExceptionHandler(ApiException.class) ResponseEntity<ApiErrorResponse> api(ApiException e,HttpServletRequest r){return out(e.status(),e.code(),e.getMessage(),List.of(),r);}
 @ExceptionHandler(MethodArgumentNotValidException.class) ResponseEntity<ApiErrorResponse> validation(MethodArgumentNotValidException e,HttpServletRequest r){var fields=e.getBindingResult().getFieldErrors().stream().map(f->new FieldErrorResponse(f.getField(),f.getRejectedValue(),f.getDefaultMessage())).toList();return out(HttpStatus.BAD_REQUEST,"VALIDATION_ERROR","Request validation failed",fields,r);}
 @ExceptionHandler(MaxUploadSizeExceededException.class) ResponseEntity<ApiErrorResponse> tooLarge(MaxUploadSizeExceededException e,HttpServletRequest r){return out(HttpStatus.PAYLOAD_TOO_LARGE,"FILE_TOO_LARGE","CV exceeds the configured size limit",List.of(),r);}
 @ExceptionHandler(DataIntegrityViolationException.class) ResponseEntity<ApiErrorResponse> conflict(DataIntegrityViolationException e,HttpServletRequest r){return out(HttpStatus.CONFLICT,"RESOURCE_CONFLICT","Resource already exists",List.of(),r);}
 @ExceptionHandler(Exception.class) ResponseEntity<ApiErrorResponse> unexpected(Exception e,HttpServletRequest r){log.error("Unhandled user-service exception traceId={} type={}",trace(r),e.getClass().getName());return out(HttpStatus.INTERNAL_SERVER_ERROR,"INTERNAL_SERVER_ERROR","An unexpected error occurred",List.of(),r);}
 private ResponseEntity<ApiErrorResponse> out(HttpStatus s,String c,String m,List<FieldErrorResponse> f,HttpServletRequest r){String t=trace(r);return ResponseEntity.status(s).header("X-Correlation-ID",t).body(new ApiErrorResponse(c,m,f,t));}
 private String trace(HttpServletRequest r){String v=r.getHeader("X-Correlation-ID");return v==null||v.isBlank()?UUID.randomUUID().toString():v;}
}

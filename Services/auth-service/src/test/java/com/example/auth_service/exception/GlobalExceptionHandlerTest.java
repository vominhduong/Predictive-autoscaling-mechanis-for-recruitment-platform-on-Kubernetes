package com.example.auth_service.exception;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import static com.example.auth_service.exception.GlobalExceptionHandler.CORRELATION_ID_HEADER;
import static org.hamcrest.Matchers.hasItem;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class GlobalExceptionHandlerTest {
    private MockMvc mockMvc;

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders.standaloneSetup(new TestController())
                .setControllerAdvice(new GlobalExceptionHandler())
                .build();
    }

    @Test
    void returnsValidationErrorsAndHidesSensitiveRejectedValues() throws Exception {
        String body = """
                {
                  "email": "not-an-email",
                  "password": "x",
                  "token": "x",
                  "refreshToken": "x",
                  "passwordHash": "x"
                }
                """;

        mockMvc.perform(post("/test/validation")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.code").value("VALIDATION_ERROR"))
                .andExpect(jsonPath("$.fieldErrors[?(@.field == 'email')].rejectedValue")
                        .value(hasItem("not-an-email")))
                .andExpect(jsonPath("$.fieldErrors[?(@.field == 'password')].rejectedValue")
                        .doesNotExist())
                .andExpect(jsonPath("$.fieldErrors[?(@.field == 'token')].rejectedValue")
                        .doesNotExist())
                .andExpect(jsonPath("$.fieldErrors[?(@.field == 'refreshToken')].rejectedValue")
                        .doesNotExist())
                .andExpect(jsonPath("$.fieldErrors[?(@.field == 'passwordHash')].rejectedValue")
                        .doesNotExist());
    }

    @Test
    void reusesCorrelationIdForBusinessException() throws Exception {
        mockMvc.perform(get("/test/email-exists").header(CORRELATION_ID_HEADER, "request-123"))
                .andExpect(status().isConflict())
                .andExpect(header().string(CORRELATION_ID_HEADER, "request-123"))
                .andExpect(jsonPath("$.code").value("EMAIL_ALREADY_EXISTS"))
                .andExpect(jsonPath("$.traceId").value("request-123"));
    }

    @Test
    void mapsDuplicateEmailConstraintToConflict() throws Exception {
        mockMvc.perform(get("/test/data-integrity"))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("EMAIL_ALREADY_EXISTS"));
    }

    @Test
    void returnsInvalidRequestForMalformedJson() throws Exception {
        mockMvc.perform(post("/test/validation")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("INVALID_REQUEST"));
    }

    @Test
    void returnsGenericMessageForUnexpectedException() throws Exception {
        mockMvc.perform(get("/test/unexpected"))
                .andExpect(status().isInternalServerError())
                .andExpect(jsonPath("$.code").value("INTERNAL_SERVER_ERROR"))
                .andExpect(jsonPath("$.message").value("An unexpected error occurred"))
                .andExpect(jsonPath("$.traceId").isNotEmpty())
                .andExpect(jsonPath("$.message").value(org.hamcrest.Matchers.not(
                        org.hamcrest.Matchers.containsString("sensitive"))));
    }

    @RestController
    static class TestController {
        @PostMapping("/test/validation")
        void validate(@Valid @RequestBody ValidationRequest request) {
        }

        @GetMapping("/test/email-exists")
        void emailExists() {
            throw new EmailAlreadyExistsException();
        }

        @GetMapping("/test/data-integrity")
        void dataIntegrity() {
            throw new DataIntegrityViolationException("uk_users_email_lower");
        }

        @GetMapping("/test/unexpected")
        void unexpected() {
            throw new IllegalStateException("sensitive password must not reach the client");
        }
    }

    record ValidationRequest(
            @NotBlank @Email String email,
            @Size(min = 8) String password,
            @Size(min = 8) String token,
            @Size(min = 8) String refreshToken,
            @Size(min = 8) String passwordHash
    ) {
    }
}

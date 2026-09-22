package com.example.auth_service.integration;

import com.example.auth_service.AbstractPostgresIntegrationTest;
import com.example.auth_service.entity.User;
import com.example.auth_service.repository.UserRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Transactional
class RegisterIntegrationTest extends AbstractPostgresIntegrationTest {
    private static final String RAW_PASSWORD = "StrongPass@123";

    @Autowired private MockMvc mockMvc;
    @Autowired private UserRepository userRepository;
    @Autowired private PasswordEncoder passwordEncoder;
    @Autowired private JdbcTemplate jdbcTemplate;

    @Test
    void registersUserThroughHttpWithFlywaySchemaAndBcryptPassword() throws Exception {
        String normalizedEmail = uniqueEmail("candidate");
        String submittedEmail = normalizedEmail.toUpperCase();

        mockMvc.perform(request(submittedEmail, RAW_PASSWORD, "CANDIDATE"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.data.email").value(normalizedEmail))
                .andExpect(jsonPath("$.data.password").doesNotExist())
                .andExpect(jsonPath("$.data.passwordHash").doesNotExist());

        User saved = userRepository.findByEmailIgnoreCase(normalizedEmail).orElseThrow();
        assertThat(saved.getEmail()).isEqualTo(normalizedEmail);
        assertThat(saved.getPasswordHash()).isNotEqualTo(RAW_PASSWORD);
        assertThat(passwordEncoder.matches(RAW_PASSWORD, saved.getPasswordHash())).isTrue();
        Integer migrationCount = jdbcTemplate.queryForObject(
                "select count(*) from flyway_schema_history where success = true", Integer.class);
        assertThat(migrationCount).isPositive();
    }

    @Test
    void duplicateEmailWithDifferentCaseReturnsConflict() throws Exception {
        String email = uniqueEmail("duplicate");
        mockMvc.perform(request(email, RAW_PASSWORD, "EMPLOYER"))
                .andExpect(status().isCreated());
        mockMvc.perform(request(email.toUpperCase(), RAW_PASSWORD, "EMPLOYER"))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("EMAIL_ALREADY_EXISTS"));
        assertThat(userRepository.findAll().stream()
                .filter(user -> user.getEmail().equalsIgnoreCase(email))).hasSize(1);
    }

    @Test
    void adminRegistrationReturnsBadRequestAndDoesNotPersistUser() throws Exception {
        String email = uniqueEmail("admin");
        mockMvc.perform(request(email, RAW_PASSWORD, "ADMIN"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("INVALID_ROLE"));
        assertThat(userRepository.existsByEmailIgnoreCase(email)).isFalse();
    }

    private String uniqueEmail(String prefix) {
        return prefix + "-" + UUID.randomUUID() + "@example.com";
    }

    private MockHttpServletRequestBuilder request(String email, String password, String role) {
        String body = """
                {"email":"%s","password":"%s","role":"%s"}
                """.formatted(email, password, role);
        return post("/api/v1/auth/register").contentType(MediaType.APPLICATION_JSON).content(body);
    }
}

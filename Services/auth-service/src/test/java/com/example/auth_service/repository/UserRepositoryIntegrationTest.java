package com.example.auth_service.repository;
import com.example.auth_service.AbstractPostgresIntegrationTest;
import com.example.auth_service.entity.User;
import com.example.auth_service.enums.UserRole;
import com.example.auth_service.enums.UserStatus;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;
import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
@SpringBootTest
@ActiveProfiles("test")
@Transactional
class UserRepositoryIntegrationTest extends AbstractPostgresIntegrationTest {
    @Autowired private UserRepository userRepository;
    @Test void savesUserAndFindsEmailIgnoringCase() {
        User saved = userRepository.saveAndFlush(newUser("candidate@example.com"));
        assertThat(saved.getId()).isNotNull();
        assertThat(userRepository.findByEmailIgnoreCase("CANDIDATE@EXAMPLE.COM")).contains(saved);
        assertThat(userRepository.existsByEmailIgnoreCase("Candidate@Example.Com")).isTrue();
    }
    @Test void rejectsDuplicateEmailIgnoringCase() {
        userRepository.saveAndFlush(newUser("employer@example.com"));
        assertThatThrownBy(() -> userRepository.saveAndFlush(newUser("EMPLOYER@EXAMPLE.COM")))
                .isInstanceOf(DataIntegrityViolationException.class);
    }
    private User newUser(String email) {
        return User.builder().email(email).passwordHash("bcrypt-hash-placeholder")
                .role(UserRole.CANDIDATE).status(UserStatus.ACTIVE).emailVerified(false).build();
    }
}

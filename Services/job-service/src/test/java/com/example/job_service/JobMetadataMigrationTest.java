package com.example.job_service;

import org.flywaydb.core.Flyway;
import org.junit.jupiter.api.Test;
import org.springframework.core.io.ClassPathResource;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.DriverManagerDataSource;
import org.springframework.jdbc.datasource.init.ScriptUtils;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

import static org.assertj.core.api.Assertions.assertThat;

@Testcontainers
class JobMetadataMigrationTest {
    @Container
    static final PostgreSQLContainer<?> POSTGRES = new PostgreSQLContainer<>("postgres:17-alpine");

    @Test
    void freshDatabaseMigratesAndSeedsAreDeterministicAndRepeatable() throws Exception {
        var source = new DriverManagerDataSource(POSTGRES.getJdbcUrl(), POSTGRES.getUsername(), POSTGRES.getPassword());
        var flyway = Flyway.configure().dataSource(source).load();
        assertThat(flyway.migrate().migrationsExecuted).isEqualTo(2);
        assertThat(flyway.info().current().getVersion().getVersion()).isEqualTo("2");
        var jdbc = new JdbcTemplate(source);
        var categories = jdbc.queryForList("select id, name, slug, active, created_at, updated_at from job_categories order by slug");
        var locations = jdbc.queryForList("select id, name, slug, active, created_at, updated_at from job_locations order by slug");
        assertThat(categories).hasSize(15);
        assertThat(locations).hasSize(10);
        assertThat(jdbc.queryForObject("select count(distinct slug) from job_categories where active", Integer.class)).isEqualTo(15);
        assertThat(jdbc.queryForObject("select count(distinct slug) from job_locations where active", Integer.class)).isEqualTo(10);
        assertThat(jdbc.queryForObject("select id::text from job_categories where slug='devops-cloud'", String.class))
                .isEqualTo("a0000000-0000-4000-8000-000000000005");
        assertThat(jdbc.queryForObject("select name from job_locations where slug='ho-chi-minh'", String.class)).isEqualTo("Hồ Chí Minh");
        try (var connection = source.getConnection()) {
            ScriptUtils.executeSqlScript(connection, new ClassPathResource("db/migration/V2__seed_job_categories_and_locations.sql"));
        }
        assertThat(jdbc.queryForList("select id, name, slug, active, created_at, updated_at from job_categories order by slug")).isEqualTo(categories);
        assertThat(jdbc.queryForList("select id, name, slug, active, created_at, updated_at from job_locations order by slug")).isEqualTo(locations);
        assertThat(flyway.migrate().migrationsExecuted).isZero();
    }
}

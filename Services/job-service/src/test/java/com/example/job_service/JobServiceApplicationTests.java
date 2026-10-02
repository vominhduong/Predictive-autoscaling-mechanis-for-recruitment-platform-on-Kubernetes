package com.example.job_service;

import com.example.job_service.entity.*;
import com.example.job_service.repository.*;
import com.sun.net.httpserver.HttpServer;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.*;
import org.springframework.test.web.servlet.MockMvc;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.*;

import java.io.IOException;
import java.math.BigDecimal;
import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;
import java.time.LocalDate;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@Testcontainers
@SpringBootTest
@AutoConfigureMockMvc
class JobServiceApplicationTests {
    @Container
    static final PostgreSQLContainer<?> POSTGRES = new PostgreSQLContainer<>("postgres:17-alpine");
    static final HttpServer USER_SERVICE = userService();
    static final UUID COMPANY = UUID.randomUUID(), OTHER_COMPANY = UUID.randomUUID(), EMPLOYER = UUID.randomUUID();
    @Autowired
    MockMvc mvc;
    @Autowired
    JobRepository jobs;
    @Autowired
    CategoryRepository categories;
    @Autowired
    LocationRepository locations;
    @Autowired
    JdbcTemplate jdbc;
    @Autowired
    jakarta.persistence.EntityManagerFactory entityManagerFactory;
    Category category;
    Location location;

    @DynamicPropertySource
    static void properties(DynamicPropertyRegistry r) {
        r.add("spring.jpa.properties.hibernate.generate_statistics", () -> "true");
        r.add("spring.datasource.url", POSTGRES::getJdbcUrl);
        r.add("spring.datasource.username", POSTGRES::getUsername);
        r.add("spring.datasource.password", POSTGRES::getPassword);
        r.add("job-service.internal-token", () -> "test-internal-secret");
        r.add("job-service.user-service.base-url", () -> "http://localhost:" + USER_SERVICE.getAddress().getPort());
    }

    @AfterAll
    static void stop() {
        USER_SERVICE.stop(0);
    }

    @BeforeEach
    void setup() {
        jobs.deleteAll();
        categories.deleteAll();
        locations.deleteAll();
        category = categories.save(new Category("Engineering", "engineering"));
        location = locations.save(new Location("Hanoi", "hanoi"));
    }

    @Test
    void flywayAndHibernateUsePostgresSchema() {
        Integer n = jdbc.queryForObject("select count(*) from information_schema.tables where table_schema='public' and table_name in ('jobs','job_categories','job_locations')", Integer.class);
        assertThat(n).isEqualTo(3);
    }

    @Test
    void publicSearchFiltersPublishedCurrentJobsAndSupportsCombinedFilters() throws Exception {
        Job visible = job(COMPANY, "Java Platform", location.getId(), category.getId(), EmploymentType.FULL_TIME, new BigDecimal("2000"), LocalDate.now().plusDays(10));
        visible.changeStatus(JobStatus.PUBLISHED);
        jobs.save(visible);
        jobs.save(job(COMPANY, "Java Draft", location.getId(), category.getId(), EmploymentType.FULL_TIME, new BigDecimal("3000"), LocalDate.now().plusDays(10)));
        Job expired = job(COMPANY, "Java Expired", location.getId(), category.getId(), EmploymentType.FULL_TIME, new BigDecimal("3000"), LocalDate.now().minusDays(1));
        expired.changeStatus(JobStatus.PUBLISHED);
        jobs.save(expired);
        mvc.perform(get("/api/v1/jobs").param("keyword", "java").param("locationId", location.getId().toString()).param("categoryId", category.getId().toString()).param("salaryMin", "1500").param("employmentType", "FULL_TIME")).andExpect(status().isOk()).andExpect(jsonPath("$.data.totalElements").value(1)).andExpect(jsonPath("$.data.content[0].title").value("Java Platform"));
        mvc.perform(get("/api/v1/jobs").param("sort", "bad-property")).andExpect(status().isBadRequest()).andExpect(jsonPath("$.code").value("VALIDATION_ERROR"));
    }

    @Test
    void publicDetailDoesNotRevealNonPublicJobs() throws Exception {
        Job draft = jobs.save(job(COMPANY, "Draft", location.getId(), category.getId(), EmploymentType.CONTRACT, null, LocalDate.now().plusDays(2)));
        mvc.perform(get("/api/v1/jobs/{id}", draft.getId())).andExpect(status().isNotFound()).andExpect(jsonPath("$.code").value("JOB_NOT_FOUND"));
    }

    @Test
    void employerCreatesDraftAndCandidateIsForbidden() throws Exception {
        mvc.perform(post("/api/v1/jobs").headers(identity(EMPLOYER, "EMPLOYER")).contentType(MediaType.APPLICATION_JSON).content(write(COMPANY, null))).andExpect(status().isCreated()).andExpect(jsonPath("$.data.status").value("DRAFT"));
        mvc.perform(post("/api/v1/jobs").headers(identity(UUID.randomUUID(), "CANDIDATE")).contentType(MediaType.APPLICATION_JSON).content(write(COMPANY, null))).andExpect(status().isForbidden()).andExpect(jsonPath("$.code").value("FORBIDDEN"));
    }

    @Test
    void outsiderAndInvalidReferencesAreRejected() throws Exception {
        mvc.perform(post("/api/v1/jobs").headers(identity(EMPLOYER, "EMPLOYER")).contentType(MediaType.APPLICATION_JSON).content(write(OTHER_COMPANY, null))).andExpect(status().isForbidden()).andExpect(jsonPath("$.code").value("COMPANY_ACCESS_DENIED"));
        String bad = write(COMPANY, null).replace(category.getId().toString(), UUID.randomUUID().toString());
        mvc.perform(post("/api/v1/jobs").headers(identity(EMPLOYER, "EMPLOYER")).contentType(MediaType.APPLICATION_JSON).content(bad)).andExpect(status().isNotFound()).andExpect(jsonPath("$.code").value("CATEGORY_NOT_FOUND"));
    }

    @Test
    void validationRejectsSalaryAndDeadline() throws Exception {
        mvc.perform(post("/api/v1/jobs").headers(identity(EMPLOYER, "EMPLOYER")).contentType(MediaType.APPLICATION_JSON).content(write(COMPANY, "\"salaryMin\":100,\"salaryMax\":10,"))).andExpect(status().isBadRequest()).andExpect(jsonPath("$.code").value("INVALID_SALARY_RANGE"));
        mvc.perform(post("/api/v1/jobs").headers(identity(EMPLOYER, "EMPLOYER")).contentType(MediaType.APPLICATION_JSON).content(write(COMPANY, null).replace(LocalDate.now().plusDays(10).toString(), LocalDate.now().minusDays(1).toString()))).andExpect(status().isBadRequest()).andExpect(jsonPath("$.code").value("VALIDATION_ERROR"));
    }

    @Test
    void updateEnforcesCompanyVersionAndTransitions() throws Exception {
        Job draft = jobs.save(job(COMPANY, "Draft", location.getId(), category.getId(), EmploymentType.FULL_TIME, null, LocalDate.now().plusDays(10)));
        mvc.perform(put("/api/v1/jobs/{id}", draft.getId()).headers(identity(EMPLOYER, "EMPLOYER")).contentType(MediaType.APPLICATION_JSON).content(write(OTHER_COMPANY, "\"version\":0,"))).andExpect(status().isBadRequest()).andExpect(jsonPath("$.code").value("IMMUTABLE_COMPANY"));
        mvc.perform(patch("/api/v1/jobs/{id}/status", draft.getId()).headers(identity(EMPLOYER, "EMPLOYER")).contentType(MediaType.APPLICATION_JSON).content("{\"status\":\"PUBLISHED\",\"version\":0}")).andExpect(status().isOk()).andExpect(jsonPath("$.data.publishedAt").isNotEmpty());
        mvc.perform(patch("/api/v1/jobs/{id}/status", draft.getId()).headers(identity(EMPLOYER, "EMPLOYER")).contentType(MediaType.APPLICATION_JSON).content("{\"status\":\"PUBLISHED\",\"version\":0}")).andExpect(status().isConflict()).andExpect(jsonPath("$.code").value("OPTIMISTIC_LOCK_CONFLICT"));
    }

    @Test
    void internalEligibilityRequiresTokenAndPreservesCorrelation() throws Exception {
        Job j = job(COMPANY, "Open", location.getId(), category.getId(), EmploymentType.FULL_TIME, null, LocalDate.now().plusDays(2));
        j.changeStatus(JobStatus.PUBLISHED);
        j = jobs.save(j);
        mvc.perform(get("/internal/jobs/{id}/eligibility", j.getId())).andExpect(status().isUnauthorized()).andExpect(jsonPath("$.code").value("INTERNAL_AUTHENTICATION_FAILED"));
        mvc.perform(get("/internal/jobs/{id}/eligibility", j.getId()).header("X-Internal-Token", "test-internal-secret")).andExpect(status().isOk()).andExpect(jsonPath("$.data.acceptingApplications").value(true));
        mvc.perform(get("/api/v1/jobs/not-a-uuid").header("X-Correlation-ID", "job-trace-1")).andExpect(status().isBadRequest()).andExpect(header().string("X-Correlation-ID", "job-trace-1")).andExpect(jsonPath("$.traceId").value("job-trace-1"));
    }

    @Test
    void openApiIsGenerated() throws Exception {
        mvc.perform(get("/v3/api-docs")).andExpect(status().isOk()).andExpect(jsonPath("$.paths['/api/v1/jobs']").exists());
    }

    @Test
    void metadataIsPublicActiveSortedAndContainsOnlyDtoFields() throws Exception {
        categories.save(new Category("Alpha", "alpha"));
        Category inactiveCategory = categories.save(new Category("Hidden", "hidden"));
        locations.save(new Location("Alpha", "alpha"));
        Location inactiveLocation = locations.save(new Location("Hidden", "hidden"));
        jdbc.update("update job_categories set active=false where id=?", inactiveCategory.getId());
        jdbc.update("update job_locations set active=false where id=?", inactiveLocation.getId());
        for (String endpoint : new String[]{"categories", "locations"}) {
            mvc.perform(get("/api/v1/jobs/metadata/" + endpoint))
                    .andExpect(status().isOk()).andExpect(jsonPath("$.success").value(true))
                    .andExpect(jsonPath("$.data.length()").value(2))
                    .andExpect(jsonPath("$.data[0].name").value("Alpha"))
                    .andExpect(jsonPath("$.data[1].name").value(endpoint.equals("categories") ? "Engineering" : "Hanoi"))
                    .andExpect(jsonPath("$.data[0].id").isNotEmpty())
                    .andExpect(jsonPath("$.data[0].slug").value("alpha"))
                    .andExpect(jsonPath("$.data[0].active").doesNotExist())
                    .andExpect(jsonPath("$.data[0].createdAt").doesNotExist())
                    .andExpect(jsonPath("$.data[0].updatedAt").doesNotExist());
        }
    }

    @Test
    void createAndUpdateRejectMissingAndInactiveReferences() throws Exception {
        Job draft = jobs.save(job(COMPANY, "Draft", location.getId(), category.getId(), EmploymentType.FULL_TIME, null, LocalDate.now().plusDays(10)));
        for (boolean update : new boolean[]{false, true}) {
            for (boolean categoryReference : new boolean[]{true, false}) {
                UUID referenceId = categoryReference ? category.getId() : location.getId();
                String prefix = categoryReference ? "CATEGORY" : "LOCATION";
                var missingRequest = update ? put("/api/v1/jobs/{id}", draft.getId()) : post("/api/v1/jobs");
                mvc.perform(missingRequest.headers(identity(EMPLOYER, "EMPLOYER")).contentType(MediaType.APPLICATION_JSON)
                                .content(write(COMPANY, "\"version\":0,").replace(referenceId.toString(), UUID.randomUUID().toString())))
                        .andExpect(status().isNotFound()).andExpect(jsonPath("$.code").value(prefix + "_NOT_FOUND"));
                String table = categoryReference ? "job_categories" : "job_locations";
                jdbc.update("update " + table + " set active=false where id=?", referenceId);
                var inactiveRequest = update ? put("/api/v1/jobs/{id}", draft.getId()) : post("/api/v1/jobs");
                mvc.perform(inactiveRequest.headers(identity(EMPLOYER, "EMPLOYER")).contentType(MediaType.APPLICATION_JSON)
                                .content(write(COMPANY, "\"version\":0,")))
                        .andExpect(status().isConflict()).andExpect(jsonPath("$.code").value(prefix + "_INACTIVE"));
                jdbc.update("update " + table + " set active=true where id=?", referenceId);
            }
        }
        mvc.perform(put("/api/v1/jobs/{id}", draft.getId()).headers(identity(EMPLOYER, "EMPLOYER"))
                        .contentType(MediaType.APPLICATION_JSON).content(write(COMPANY, "\"version\":0,")))
                .andExpect(status().isOk()).andExpect(jsonPath("$.data.category.id").value(category.getId().toString()))
                .andExpect(jsonPath("$.data.location.id").value(location.getId().toString()));
    }

    @Test
    void pagedJobSummariesUseBoundedQueriesForDistinctReferences() throws Exception {
        for (int i = 0; i < 6; i++) {
            Category c = categories.save(new Category("Category " + i, "cat-" + i));
            Location l = locations.save(new Location("Location " + i, "loc-" + i));
            Job j = job(COMPANY, "Job " + i, l.getId(), c.getId(), EmploymentType.FULL_TIME, null, LocalDate.now().plusDays(10));
            j.changeStatus(JobStatus.PUBLISHED);
            jobs.save(j);
        }
        var statistics = entityManagerFactory.unwrap(org.hibernate.SessionFactory.class).getStatistics();
        statistics.clear();
        mvc.perform(get("/api/v1/jobs").param("size", "5"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.data.content.length()").value(5))
                .andExpect(jsonPath("$.data.content[0].category.name").isNotEmpty())
                .andExpect(jsonPath("$.data.content[0].location.slug").isNotEmpty());
        assertThat(statistics.getPrepareStatementCount()).isEqualTo(4); // page, count, categories, locations
        statistics.clear();
        mvc.perform(get("/api/v1/employer/jobs").param("companyId", COMPANY.toString()).param("size", "5")
                .headers(identity(EMPLOYER, "EMPLOYER"))).andExpect(status().isOk());
        assertThat(statistics.getPrepareStatementCount()).isEqualTo(4);
    }

    private Job job(UUID company, String title, UUID loc, UUID cat, EmploymentType type, BigDecimal salary, LocalDate deadline) {
        return new Job(company, EMPLOYER, title, "Description", "Requirements", loc, cat, type, salary, salary, "USD", salary == null, deadline);
    }

    private org.springframework.http.HttpHeaders identity(UUID id, String role) {
        var h = new org.springframework.http.HttpHeaders();
        h.set("X-User-Id", id.toString());
        h.set("X-User-Email", "employer@example.com");
        h.set("X-User-Role", role);
        h.set("X-Correlation-ID", "test-trace");
        return h;
    }

    private String write(UUID company, String salary) {
        return "{" + (salary == null ? "\"salaryMin\":100,\"salaryMax\":200," : salary) + "\"companyId\":\"" + company + "\",\"title\":\"Java Developer\",\"description\":\"Description\",\"requirements\":\"Requirements\",\"locationId\":\"" + location.getId() + "\",\"categoryId\":\"" + category.getId() + "\",\"employmentType\":\"FULL_TIME\",\"salaryCurrency\":\"USD\",\"salaryNegotiable\":false,\"applicationDeadline\":\"" + LocalDate.now().plusDays(10) + "\"}";
    }

    private static HttpServer userService() {
        try {
            HttpServer s = HttpServer.create(new InetSocketAddress(0), 0);
            s.createContext("/internal/companies/", e -> {
                boolean ok = e.getRequestURI().getPath().contains(COMPANY.toString()) && "test-internal-secret".equals(e.getRequestHeaders().getFirst("X-Internal-Token"));
                byte[] b = (ok ? "{\"success\":true,\"data\":{\"canManage\":true,\"memberRole\":\"OWNER\"}}" : "{\"success\":true,\"data\":{\"canManage\":false,\"memberRole\":null}}").getBytes(StandardCharsets.UTF_8);
                e.getResponseHeaders().set("Content-Type", "application/json");
                e.sendResponseHeaders(200, b.length);
                e.getResponseBody().write(b);
                e.close();
            });
            s.start();
            return s;
        } catch (IOException e) {
            throw new ExceptionInInitializerError(e);
        }
    }
}

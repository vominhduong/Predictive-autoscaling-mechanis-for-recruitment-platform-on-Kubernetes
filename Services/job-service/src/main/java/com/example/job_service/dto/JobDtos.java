package com.example.job_service.dto;

import com.example.job_service.entity.*;
import jakarta.validation.constraints.*;

import java.math.BigDecimal;
import java.time.*;
import java.util.*;

public final class JobDtos {
    private JobDtos() {}

    public record Write(
            @NotNull UUID companyId,
            @NotBlank @Size(max = 255) String title,
            @NotBlank @Size(max = 20000) String description,
            @NotBlank @Size(max = 20000) String requirements,
            @NotNull UUID locationId,
            @NotNull UUID categoryId,
            @NotNull EmploymentType employmentType,
            @PositiveOrZero BigDecimal salaryMin,
            @PositiveOrZero BigDecimal salaryMax,
            @NotBlank @Pattern(regexp = "[A-Z]{3}") String salaryCurrency,
            boolean salaryNegotiable,
            @NotNull @Future LocalDate applicationDeadline,
            Long version) {}

    public record StatusChange(@NotNull JobStatus status, @NotNull Long version) {}
    public record Summary(UUID id, String name, String slug) {}
    public record View(UUID id, UUID companyId, String title, String description, String requirements,
                       Summary location, Summary category, EmploymentType employmentType,
                       BigDecimal salaryMin, BigDecimal salaryMax, String salaryCurrency,
                       boolean salaryNegotiable, JobStatus status, LocalDate applicationDeadline,
                       Instant publishedAt, Instant createdAt, Instant updatedAt, long version) {}
    public record PageData<T>(List<T> content, int page, int size, long totalElements,
                              int totalPages, boolean first, boolean last) {}
    public record Eligibility(UUID jobId, UUID companyId, UUID createdBy, String title, JobStatus status,
                              LocalDate applicationDeadline, boolean acceptingApplications, long version) {}
}

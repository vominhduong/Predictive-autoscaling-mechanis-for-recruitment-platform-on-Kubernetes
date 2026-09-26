package com.example.job_service.entity;

import jakarta.persistence.*;

import java.math.BigDecimal;
import java.time.*;
import java.util.UUID;

@Entity
@Table(name = "jobs")
public class Job {
    @Id
    private UUID id;
    @Column(name = "company_id", nullable = false)
    private UUID companyId;
    @Column(name = "created_by", nullable = false)
    private UUID createdBy;
    private String title;
    @Column(columnDefinition = "text")
    private String description;
    @Column(columnDefinition = "text")
    private String requirements;
    @Column(name = "location_id")
    private UUID locationId;
    @Column(name = "category_id")
    private UUID categoryId;
    @Enumerated(EnumType.STRING)
    @Column(name = "employment_type")
    private EmploymentType employmentType;
    @Column(name = "salary_min")
    private BigDecimal salaryMin;
    @Column(name = "salary_max")
    private BigDecimal salaryMax;
    @Column(name = "salary_currency")
    private String salaryCurrency;
    @Column(name = "salary_negotiable")
    private boolean salaryNegotiable;
    @Enumerated(EnumType.STRING)
    private JobStatus status;
    @Column(name = "application_deadline")
    private LocalDate applicationDeadline;
    @Column(name = "published_at")
    private Instant publishedAt;
    @Column(name = "created_at")
    private Instant createdAt;
    @Column(name = "updated_at")
    private Instant updatedAt;
    @Version
    private long version;

    protected Job() {
    }

    public Job(UUID company, UUID user, String t, String d, String r, UUID loc, UUID cat, EmploymentType type, BigDecimal min, BigDecimal max, String currency, boolean neg, LocalDate deadline) {
        id = UUID.randomUUID();
        companyId = company;
        createdBy = user;
        status = JobStatus.DRAFT;
        createdAt = Instant.now();
        updatedAt = createdAt;
        update(t, d, r, loc, cat, type, min, max, currency, neg, deadline);
    }

    public void update(String t, String d, String r, UUID loc, UUID cat, EmploymentType type, BigDecimal min, BigDecimal max, String currency, boolean neg, LocalDate deadline) {
        title = t.trim();
        description = d.trim();
        requirements = r.trim();
        locationId = loc;
        categoryId = cat;
        employmentType = type;
        salaryMin = min;
        salaryMax = max;
        salaryCurrency = currency.toUpperCase();
        salaryNegotiable = neg;
        applicationDeadline = deadline;
        updatedAt = Instant.now();
    }

    public void changeStatus(JobStatus next) {
        status = next;
        if (next == JobStatus.PUBLISHED && publishedAt == null) publishedAt = Instant.now();
        updatedAt = Instant.now();
    }

    public UUID getId() {
        return id;
    }

    public UUID getCompanyId() {
        return companyId;
    }

    public UUID getCreatedBy() {
        return createdBy;
    }

    public String getTitle() {
        return title;
    }

    public String getDescription() {
        return description;
    }

    public String getRequirements() {
        return requirements;
    }

    public UUID getLocationId() {
        return locationId;
    }

    public UUID getCategoryId() {
        return categoryId;
    }

    public EmploymentType getEmploymentType() {
        return employmentType;
    }

    public BigDecimal getSalaryMin() {
        return salaryMin;
    }

    public BigDecimal getSalaryMax() {
        return salaryMax;
    }

    public String getSalaryCurrency() {
        return salaryCurrency;
    }

    public boolean isSalaryNegotiable() {
        return salaryNegotiable;
    }

    public JobStatus getStatus() {
        return status;
    }

    public LocalDate getApplicationDeadline() {
        return applicationDeadline;
    }

    public Instant getPublishedAt() {
        return publishedAt;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public Instant getUpdatedAt() {
        return updatedAt;
    }

    public long getVersion() {
        return version;
    }
}

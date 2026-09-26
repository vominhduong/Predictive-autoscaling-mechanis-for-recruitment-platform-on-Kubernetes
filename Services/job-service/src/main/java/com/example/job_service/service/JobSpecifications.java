package com.example.job_service.service;

import com.example.job_service.entity.*;
import org.springframework.data.jpa.domain.Specification;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

public final class JobSpecifications {
    private JobSpecifications() {}

    public static Specification<Job> publicJobs(String keyword, UUID locationId, UUID categoryId,
                                                 BigDecimal salaryMin, EmploymentType employmentType) {
        return (root, query, cb) -> {
            var predicates = new java.util.ArrayList<jakarta.persistence.criteria.Predicate>();
            predicates.add(cb.equal(root.get("status"), JobStatus.PUBLISHED));
            predicates.add(cb.greaterThanOrEqualTo(root.get("applicationDeadline"), LocalDate.now()));
            if (keyword != null && !keyword.isBlank()) {
                String escaped = keyword.trim().toLowerCase().replace("\\", "\\\\")
                        .replace("%", "\\%").replace("_", "\\_");
                predicates.add(cb.like(cb.lower(root.get("title")), "%" + escaped + "%", '\\'));
            }
            if (locationId != null) predicates.add(cb.equal(root.get("locationId"), locationId));
            if (categoryId != null) predicates.add(cb.equal(root.get("categoryId"), categoryId));
            if (salaryMin != null) predicates.add(cb.greaterThanOrEqualTo(root.get("salaryMax"), salaryMin));
            if (employmentType != null) predicates.add(cb.equal(root.get("employmentType"), employmentType));
            return cb.and(predicates.toArray(jakarta.persistence.criteria.Predicate[]::new));
        };
    }
}

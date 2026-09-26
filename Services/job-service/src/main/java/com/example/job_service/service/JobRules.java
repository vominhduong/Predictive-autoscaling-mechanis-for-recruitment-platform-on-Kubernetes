package com.example.job_service.service;

import com.example.job_service.entity.JobStatus;
import com.example.job_service.exception.ApiException;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.Map;
import java.util.Set;

@Component
public class JobRules {
    private static final Map<JobStatus, Set<JobStatus>> TRANSITIONS = Map.of(
            JobStatus.DRAFT, Set.of(JobStatus.PUBLISHED, JobStatus.CLOSED),
            JobStatus.PUBLISHED, Set.of(JobStatus.HIDDEN, JobStatus.CLOSED),
            JobStatus.HIDDEN, Set.of(JobStatus.PUBLISHED, JobStatus.CLOSED),
            JobStatus.CLOSED, Set.of());

    public void validateSalary(BigDecimal min, BigDecimal max) {
        if ((min != null && min.signum() < 0) || (max != null && max.signum() < 0)
                || (min != null && max != null && max.compareTo(min) < 0))
            throw new ApiException(HttpStatus.BAD_REQUEST, "INVALID_SALARY_RANGE", "Salary range is invalid");
    }

    public void validateDeadline(LocalDate deadline) {
        if (deadline == null || !deadline.isAfter(LocalDate.now()))
            throw new ApiException(HttpStatus.BAD_REQUEST, "JOB_APPLICATION_CLOSED",
                    "Application deadline must be in the future");
    }

    public void validateTransition(JobStatus current, JobStatus next, LocalDate deadline) {
        if (!TRANSITIONS.getOrDefault(current, Set.of()).contains(next))
            throw new ApiException(HttpStatus.CONFLICT, "INVALID_JOB_STATUS_TRANSITION",
                    "Job status transition is not allowed");
        if (next == JobStatus.PUBLISHED) validateDeadline(deadline);
    }
}

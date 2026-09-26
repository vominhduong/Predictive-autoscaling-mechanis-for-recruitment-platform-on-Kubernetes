package com.example.application_service.dto;

import com.example.application_service.entity.ApplicationStatus;
import jakarta.validation.constraints.*;

import java.time.Instant;
import java.util.*;

public final class ApplicationDtos {
    private ApplicationDtos() {
    }

    public record Apply(@NotNull UUID jobId, @NotNull UUID cvId, @Size(max = 10000) String coverLetter) {
    }

    public record StatusChange(@NotNull ApplicationStatus newStatus, @Size(max = 2000) String note,
                               @NotNull Long version) {
    }

    public record View(UUID id, UUID jobId, UUID candidateId, UUID companyId, UUID cvId, String cvFileName,
                       String jobTitle, String candidateIdentity, String coverLetter, ApplicationStatus status,
                       Instant createdAt, Instant updatedAt, long version) {
    }

    public record HistoryView(UUID id, ApplicationStatus fromStatus, ApplicationStatus toStatus, UUID changedBy,
                              String note, Instant createdAt) {
    }

    public record Detail(View application, List<HistoryView> history) {
    }

    public record PageData<T>(List<T> content, int page, int size, long totalElements, int totalPages, boolean first,
                              boolean last) {
    }
}

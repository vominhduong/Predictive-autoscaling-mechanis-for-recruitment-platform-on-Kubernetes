package com.example.application_service.entity;

import jakarta.persistence.*;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "applications", uniqueConstraints = @UniqueConstraint(name = "uk_applications_candidate_job", columnNames = {"candidate_id", "job_id"}))
public class JobApplication {
    @Id
    private UUID id;
    @Column(name = "job_id", nullable = false)
    private UUID jobId;
    @Column(name = "candidate_id", nullable = false)
    private UUID candidateId;
    @Column(name = "employer_id", nullable = false)
    private UUID employerId;
    @Column(name = "company_id", nullable = false)
    private UUID companyId;
    @Column(name = "cv_id", nullable = false)
    private UUID cvId;
    @Column(name = "cv_object_key_snapshot", nullable = false, length = 500)
    private String cvObjectKeySnapshot;
    @Column(name = "cv_file_name_snapshot", nullable = false)
    private String cvFileNameSnapshot;
    @Column(name = "job_title_snapshot", nullable = false)
    private String jobTitleSnapshot;
    @Column(name = "candidate_identity_snapshot", nullable = false)
    private String candidateIdentitySnapshot;
    @Column(name = "cover_letter", columnDefinition = "text")
    private String coverLetter;
    @Enumerated(EnumType.STRING)
    private ApplicationStatus status;
    @Column(name = "created_at")
    private Instant createdAt;
    @Column(name = "updated_at")
    private Instant updatedAt;
    @Version
    private long version;

    protected JobApplication() {
    }

    public JobApplication(UUID jobId, UUID candidateId, UUID employerId, UUID companyId, UUID cvId, String objectKey, String fileName, String jobTitle, String candidateIdentity, String coverLetter) {
        this.id = UUID.randomUUID();
        this.jobId = jobId;
        this.candidateId = candidateId;
        this.employerId = employerId;
        this.companyId = companyId;
        this.cvId = cvId;
        this.cvObjectKeySnapshot = objectKey;
        this.cvFileNameSnapshot = fileName;
        this.jobTitleSnapshot = jobTitle;
        this.candidateIdentitySnapshot = candidateIdentity;
        this.coverLetter = coverLetter == null ? null : coverLetter.trim();
        this.status = ApplicationStatus.APPLIED;
        this.createdAt = Instant.now();
        this.updatedAt = createdAt;
    }

    public void transition(ApplicationStatus next) {
        status = next;
        updatedAt = Instant.now();
    }

    public UUID getId() {
        return id;
    }

    public UUID getJobId() {
        return jobId;
    }

    public UUID getCandidateId() {
        return candidateId;
    }

    public UUID getEmployerId() {
        return employerId;
    }

    public UUID getCompanyId() {
        return companyId;
    }

    public UUID getCvId() {
        return cvId;
    }

    public String getCvObjectKeySnapshot() {
        return cvObjectKeySnapshot;
    }

    public String getCvFileNameSnapshot() {
        return cvFileNameSnapshot;
    }

    public String getJobTitleSnapshot() {
        return jobTitleSnapshot;
    }

    public String getCandidateIdentitySnapshot() {
        return candidateIdentitySnapshot;
    }

    public String getCoverLetter() {
        return coverLetter;
    }

    public ApplicationStatus getStatus() {
        return status;
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

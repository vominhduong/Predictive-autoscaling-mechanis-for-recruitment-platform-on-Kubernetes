package com.example.notification_service;

import com.example.notification_service.event.ApplicationEvent;
import com.example.notification_service.service.EmailTemplateService;
import org.junit.jupiter.api.Test;

import java.time.Instant;
import java.util.UUID;

import static org.assertj.core.api.Assertions.*;

class EmailTemplateServiceTest {
    private final EmailTemplateService templates = new EmailTemplateService();

    @Test
    void mapsSubmittedAndStatusTemplates() {
        var data = new ApplicationEvent.Data(UUID.randomUUID(), UUID.randomUUID(), UUID.randomUUID(), UUID.randomUUID(), "candidate@example.com", "Engineer", null, "APPLIED", "trace");
        assertThat(templates.render(new ApplicationEvent(UUID.randomUUID(), "APPLICATION_SUBMITTED", 1, Instant.now(), "application-service", data)).templateCode()).isEqualTo("APPLICATION_SUBMITTED");
        var changed = new ApplicationEvent.Data(data.applicationId(), data.jobId(), data.companyId(), data.candidateId(), data.candidateEmail(), data.jobTitle(), "APPLIED", "SCREENING", "trace");
        assertThat(templates.render(new ApplicationEvent(UUID.randomUUID(), "APPLICATION_STATUS_CHANGED", 1, Instant.now(), "application-service", changed)).body()).contains("APPLIED", "SCREENING");
    }

    @Test
    void submittedTemplateUsesVietnameseNamesJobCompanyAndApplicationTime() {
        var data = new ApplicationEvent.Data(UUID.randomUUID(), UUID.randomUUID(), UUID.randomUUID(),
                UUID.randomUUID(), "candidate@example.com", "Kỹ sư Java", null, "APPLIED", "trace");
        var event = new ApplicationEvent(UUID.randomUUID(), "APPLICATION_SUBMITTED", 1,
                Instant.parse("2026-10-02T03:15:00Z"), "application-service", data);
        var message = templates.renderSubmitted(event, "Nguyễn An", "Công ty Sao Việt");
        assertThat(message.subject()).contains("Kỹ sư Java");
        assertThat(message.body()).contains("Nguyễn An", "Kỹ sư Java", "Công ty Sao Việt",
                "02/10/2026 10:15", "Việc đã ứng tuyển", "hồ sơ đã được tiếp nhận");
        assertThat(message.body()).doesNotContain("đã được tuyển");
    }
}

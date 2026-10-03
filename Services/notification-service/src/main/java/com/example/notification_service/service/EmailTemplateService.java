package com.example.notification_service.service;

import com.example.notification_service.event.ApplicationEvent;
import org.springframework.stereotype.Service;

import java.time.ZoneId;
import java.time.format.DateTimeFormatter;

@Service
public class EmailTemplateService {
    private static final DateTimeFormatter DATE_TIME = DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm")
            .withZone(ZoneId.of("Asia/Ho_Chi_Minh"));

    public EmailMessage renderSubmitted(ApplicationEvent event, String candidateName, String companyName) {
        String name = safe(candidateName);
        if (name.isBlank()) name = safe(event.data().candidateEmail());
        String job = safe(event.data().jobTitle());
        String company = safe(companyName);
        String body = "Xin chào " + name + ",\n\n"
                + "Chúng tôi đã nhận được hồ sơ ứng tuyển của bạn.\n"
                + "Vị trí: " + job + "\n"
                + "Công ty: " + company + "\n"
                + "Thời gian ứng tuyển: " + DATE_TIME.format(event.occurredAt()) + " (GMT+7)\n\n"
                + "Bạn có thể đăng nhập vào Recruitment Platform và mở mục Việc đã ứng tuyển "
                + "để theo dõi trạng thái hồ sơ.\n\n"
                + "Email này xác nhận hồ sơ đã được tiếp nhận; kết quả tuyển dụng sẽ được cập nhật sau.";
        return new EmailMessage("APPLICATION_SUBMITTED", "Xác nhận đã nhận hồ sơ ứng tuyển: " + job, body);
    }

    public EmailMessage render(ApplicationEvent event) {
        String job = safe(event.data().jobTitle());
        return switch (event.eventType()) {
            case "APPLICATION_SUBMITTED" ->
                    new EmailMessage("APPLICATION_SUBMITTED", "Application received: " + job, "Your application for " + job + " has been received.");
            case "APPLICATION_STATUS_CHANGED" ->
                    new EmailMessage("APPLICATION_STATUS_CHANGED", "Application status updated: " + job, "Your application for " + job + " changed from " + safe(event.data().oldStatus()) + " to " + safe(event.data().newStatus()) + ".");
            default -> throw new IllegalArgumentException("Unsupported event type");
        };
    }

    private String safe(String value) {
        if (value == null) return "";
        return value.replace('\r', ' ').replace('\n', ' ').substring(0, Math.min(150, value.length()));
    }

    public record EmailMessage(String templateCode, String subject, String body) {
    }
}

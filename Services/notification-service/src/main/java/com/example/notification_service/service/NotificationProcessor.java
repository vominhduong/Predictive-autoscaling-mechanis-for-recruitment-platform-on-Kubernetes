package com.example.notification_service.service;

import com.example.notification_service.client.BrevoEmailSender;
import com.example.notification_service.client.UserNotificationContextClient;
import com.example.notification_service.entity.*;
import com.example.notification_service.event.ApplicationEvent;
import com.example.notification_service.repository.*;
import io.micrometer.core.instrument.*;
import jakarta.mail.internet.InternetAddress;
import org.slf4j.*;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class NotificationProcessor {
    private static final Logger log = LoggerFactory.getLogger(NotificationProcessor.class);
    private final NotificationRepository notifications;
    private final ProcessedEventRepository processed;
    private final EmailTemplateService templates;
    private final JavaMailSender mail;
    private final BrevoEmailSender brevo;
    private final UserNotificationContextClient context;
    private final String from;
    private final Counter consumed, sent, duplicates, failed, retries;

    public NotificationProcessor(NotificationRepository n, ProcessedEventRepository p, EmailTemplateService t,
                                 JavaMailSender m, BrevoEmailSender brevo, UserNotificationContextClient context,
                                 @Value("${notification.mail.from}") String from, MeterRegistry meter) {
        notifications = n;
        processed = p;
        templates = t;
        mail = m;
        this.brevo = brevo;
        this.context = context;
        this.from = from;
        consumed = meter.counter("notification.events.consumed");
        sent = meter.counter("notification.email.sent");
        duplicates = meter.counter("notification.events.duplicate");
        failed = meter.counter("notification.email.failed");
        retries = meter.counter("notification.events.retry");
    }

    @Transactional
    public void process(ApplicationEvent event) {
        consumed.increment();
        if (processed.existsById(event.eventId())) {
            duplicates.increment();
            log.info("notification_duplicate eventId={} applicationId={}", event.eventId(), event.data().applicationId());
            return;
        }
        validate(event);
        if ("APPLICATION_SUBMITTED".equals(event.eventType())) {
            processSubmitted(event);
            return;
        }
        var rendered = templates.render(event);
        Notification record = notifications.findByEventId(event.eventId()).orElseGet(() -> notifications.save(new Notification(event.eventId(), event.data().candidateEmail(), rendered.templateCode(), rendered.subject())));
        try {
            SimpleMailMessage message = new SimpleMailMessage();
            message.setFrom(from);
            message.setTo(event.data().candidateEmail());
            message.setSubject(rendered.subject());
            message.setText(rendered.body());
            mail.send(message);
            record.sent();
            processed.save(new ProcessedEvent(event.eventId(), event.eventType()));
            sent.increment();
            log.info("notification_sent eventId={} applicationId={} traceId={}", event.eventId(), event.data().applicationId(), event.data().correlationId());
        } catch (RuntimeException e) {
            failed.increment();
            retries.increment();
            throw e;
        }
    }

    private void processSubmitted(ApplicationEvent event) {
        var record = notifications.findByEventId(event.eventId()).orElseGet(() -> notifications.save(
                new Notification(event.eventId(), event.data().candidateEmail(),
                        "APPLICATION_SUBMITTED", "Xác nhận đã nhận hồ sơ ứng tuyển")));
        if (record.getStatus() == NotificationStatus.SENT || record.getStatus() == NotificationStatus.FAILED) {
            processed.save(new ProcessedEvent(event.eventId(), event.eventType()));
            duplicates.increment();
            return;
        }
        try {
            var names = context.get(event.data().candidateId(), event.data().companyId());
            String candidateName = names.candidateName() == null || names.candidateName().isBlank()
                    ? event.data().candidateEmail() : names.candidateName();
            var rendered = templates.renderSubmitted(event, candidateName, names.companyName());
            record.subject(rendered.subject());
            brevo.send(event.data().candidateEmail(), candidateName, rendered.subject(), rendered.body());
            record.sent();
            sent.increment();
            log.info("notification_sent eventId={} applicationId={} traceId={}",
                    event.eventId(), event.data().applicationId(), event.data().correlationId());
        } catch (RuntimeException e) {
            record.failed(e.getClass().getSimpleName());
            failed.increment();
            // An HTTP timeout has an unknown outcome. Do not resend this event automatically.
            log.warn("notification_delivery_failed eventId={} applicationId={} errorType={}",
                    event.eventId(), event.data().applicationId(), e.getClass().getSimpleName());
        }
        processed.save(new ProcessedEvent(event.eventId(), event.eventType()));
    }

    private void validate(ApplicationEvent e) {
        if (e == null || e.eventId() == null || e.eventVersion() != 1 || e.data() == null || e.data().applicationId() == null || !("APPLICATION_SUBMITTED".equals(e.eventType()) || "APPLICATION_STATUS_CHANGED".equals(e.eventType())))
            throw new IllegalArgumentException("Unsupported or invalid event contract");
        try {
            new InternetAddress(e.data().candidateEmail(), true).validate();
        } catch (Exception x) {
            throw new IllegalArgumentException("Invalid recipient");
        }
    }
}

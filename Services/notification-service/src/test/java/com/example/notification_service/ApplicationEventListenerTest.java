package com.example.notification_service;

import com.example.notification_service.event.ApplicationEvent;
import com.example.notification_service.messaging.ApplicationEventListener;
import com.example.notification_service.service.NotificationProcessor;
import io.micrometer.core.instrument.simple.SimpleMeterRegistry;
import org.junit.jupiter.api.Test;
import tools.jackson.databind.json.JsonMapper;

import java.time.Instant;
import java.util.UUID;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;

class ApplicationEventListenerTest {
    private final JsonMapper json = JsonMapper.builder().build();
    private final NotificationProcessor processor = mock(NotificationProcessor.class);
    private final ApplicationEventListener listener = new ApplicationEventListener(json, processor,
            new SimpleMeterRegistry());

    @Test
    void unexpectedReceiptFailureIsAcknowledgedWithoutAutomaticResend() {
        var event = event("APPLICATION_SUBMITTED");
        doThrow(new IllegalStateException("commit failed")).when(processor).process(event);
        assertThatCode(() -> listener.receive(json.writeValueAsBytes(event))).doesNotThrowAnyException();
        verify(processor, times(1)).process(event);
    }

    @Test
    void existingStatusNotificationFailureStillUsesItsRetryPolicy() {
        var event = event("APPLICATION_STATUS_CHANGED");
        doThrow(new IllegalStateException("smtp unavailable")).when(processor).process(event);
        assertThatThrownBy(() -> listener.receive(json.writeValueAsBytes(event)))
                .isInstanceOf(IllegalStateException.class);
    }

    private ApplicationEvent event(String type) {
        return new ApplicationEvent(UUID.randomUUID(), type, 1, Instant.now(), "application-service",
                new ApplicationEvent.Data(UUID.randomUUID(), UUID.randomUUID(), UUID.randomUUID(),
                        UUID.randomUUID(), "candidate@example.com", "Engineer", null, "APPLIED", "trace"));
    }
}

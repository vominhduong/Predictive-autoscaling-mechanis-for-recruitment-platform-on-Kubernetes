package com.example.application_service.service;

import com.example.application_service.entity.OutboxEvent;
import com.example.application_service.entity.OutboxStatus;
import com.example.application_service.repository.OutboxEventRepository;
import org.junit.jupiter.api.Test;
import org.springframework.data.domain.Pageable;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.SimpleTransactionStatus;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class OutboxPublisherTest {
    private final OutboxEventRepository repository = mock(OutboxEventRepository.class);
    private final ConfirmedEventSender sender = mock(ConfirmedEventSender.class);
    private final PlatformTransactionManager transactionManager = transactionManager();

    @Test
    void confirmedPublishUsesConfiguredRouteAndMarksPublished() throws Exception {
        OutboxEvent event = event("APPLICATION_SUBMITTED");
        when(repository.findById(event.getId())).thenReturn(Optional.of(event));
        OutboxPublisher publisher = publisher();

        publisher.publish(event);

        verify(sender).send("recruitment.events", "application.submitted", event);
        assertThat(event.getStatus()).isEqualTo(OutboxStatus.PUBLISHED);
        assertThat(event.getPublishedAt()).isNotNull();
    }

    @Test
    void failedPublishRemainsAvailableForBackoffRetry() throws Exception {
        OutboxEvent event = event("APPLICATION_STATUS_CHANGED");
        when(repository.findById(event.getId())).thenReturn(Optional.of(event));
        doThrow(new IllegalStateException("nack")).when(sender)
                .send("recruitment.events", "application.status-changed", event);

        publisher().publish(event);

        assertThat(event.getStatus()).isEqualTo(OutboxStatus.FAILED);
        assertThat(event.getAttemptCount()).isEqualTo(1);
        assertThat(event.getPublishedAt()).isNull();
        assertThat(event.getNextAttemptAt()).isAfter(event.getCreatedAt());
    }

    @Test
    void claimUsesLockedBatchAndMovesRowsToInProgress() {
        OutboxEvent event = event("APPLICATION_SUBMITTED");
        when(repository.lockBatch(any(), eq(OutboxStatus.IN_PROGRESS), any(), any(), any(Pageable.class)))
                .thenReturn(List.of(event));

        assertThat(publisher().claim()).containsExactly(event);
        assertThat(event.getStatus()).isEqualTo(OutboxStatus.IN_PROGRESS);
        verify(repository).lockBatch(any(), eq(OutboxStatus.IN_PROGRESS), any(), any(), any(Pageable.class));
    }

    private OutboxPublisher publisher() {
        return new OutboxPublisher(repository, sender, transactionManager, "recruitment.events",
                "application.submitted", "application.status-changed", 25, 8);
    }

    private OutboxEvent event(String type) {
        return new OutboxEvent(UUID.randomUUID(), UUID.randomUUID(), type, 1, "{}");
    }

    private PlatformTransactionManager transactionManager() {
        PlatformTransactionManager manager = mock(PlatformTransactionManager.class);
        when(manager.getTransaction(any())).thenAnswer(ignored -> new SimpleTransactionStatus());
        return manager;
    }
}

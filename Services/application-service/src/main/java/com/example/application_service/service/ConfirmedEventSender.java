package com.example.application_service.service;

import com.example.application_service.entity.OutboxEvent;
import org.springframework.amqp.core.Message;
import org.springframework.amqp.core.MessageDeliveryMode;
import org.springframework.amqp.core.MessageProperties;
import org.springframework.amqp.rabbit.connection.CorrelationData;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.concurrent.TimeUnit;

@Component
public class ConfirmedEventSender {
    private final RabbitTemplate rabbit;
    private final Duration timeout;

    public ConfirmedEventSender(RabbitTemplate rabbit,
                                @Value("${application-service.outbox.confirm-timeout}") Duration timeout) {
        this.rabbit = rabbit;
        this.timeout = timeout;
    }

    public void send(String exchange, String routingKey, OutboxEvent event) throws Exception {
        MessageProperties properties = new MessageProperties();
        properties.setContentType(MessageProperties.CONTENT_TYPE_JSON);
        properties.setDeliveryMode(MessageDeliveryMode.PERSISTENT);
        properties.setMessageId(event.getId().toString());
        properties.setHeader("eventId", event.getId().toString());
        Message message = new Message(event.getPayload().getBytes(StandardCharsets.UTF_8), properties);
        CorrelationData correlation = new CorrelationData(event.getId().toString());
        rabbit.send(exchange, routingKey, message, correlation);
        CorrelationData.Confirm confirm = correlation.getFuture().get(timeout.toMillis(), TimeUnit.MILLISECONDS);
        if (!confirm.isAck()) {
            throw new IllegalStateException("Broker did not confirm event");
        }
    }
}

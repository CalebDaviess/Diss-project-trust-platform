package com.trustplatform.accountability.event;

import io.smallrye.reactive.messaging.ce.OutgoingCloudEventMetadata;
import jakarta.enterprise.context.ApplicationScoped;
import org.eclipse.microprofile.reactive.messaging.Channel;
import org.eclipse.microprofile.reactive.messaging.Emitter;
import org.eclipse.microprofile.reactive.messaging.Message;
import java.net.URI;
import java.time.ZoneOffset;
import java.util.UUID;

/**
 * Publishes a conduct-report as a CloudEvent to Kafka (topic configured on the
 * {@code conduct-reports-out} channel). Each message carries a CloudEvent 1.0 envelope
 * (id/type/source/subject/time) with the {@link ConductReportData} as its {@code data}.
 *
 * <p>The report crosses a real broker so a separate operator system could consume it.
 */
@ApplicationScoped
public class ConductReportPublisher {
    /** CloudEvent source identifying the emitting component. */
    private static final URI SOURCE = URI.create("/accountability-service/case-engine");
    private final Emitter<ConductReportData> emitter;

    public ConductReportPublisher(@Channel("conduct-reports-out") Emitter<ConductReportData> emitter) {
        this.emitter = emitter;
    }

    public void publish(ConductReportData data) {
        OutgoingCloudEventMetadata<ConductReportData> metadata =
                OutgoingCloudEventMetadata.<ConductReportData>builder()
                        .withId(UUID.randomUUID().toString())
                        .withType(ConductReportedEvent.TYPE)
                        .withSource(SOURCE)
                        .withSubject(data.profileId())
                        .withTimestamp(data.timestamp().atZone(ZoneOffset.UTC))
                        .build();
        emitter.send(Message.of(data).addMetadata(metadata));
    }
}


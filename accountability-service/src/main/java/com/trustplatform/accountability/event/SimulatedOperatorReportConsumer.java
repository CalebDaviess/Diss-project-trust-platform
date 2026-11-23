package com.trustplatform.accountability.event;
import io.smallrye.reactive.messaging.ce.IncomingCloudEventMetadata;
import jakarta.enterprise.context.ApplicationScoped;
import org.eclipse.microprofile.reactive.messaging.Incoming;
import org.eclipse.microprofile.reactive.messaging.Message;
import org.jboss.logging.Logger;
import java.util.List;
import java.util.concurrent.CompletionStage;
import java.util.concurrent.CopyOnWriteArrayList;
/**
 * Stands in for a game operator's reporting endpoint. Consumes conduct-report CloudEvents from
 * the {@code conduct-reports-in} channel (Kafka in dev/prod, in-memory in tests) and records what
 * it received. Business data comes from the {@link ConductReportData} payload; the CloudEvent
 * envelope (if present) supplies the {@code type}.
 */
@ApplicationScoped
public class SimulatedOperatorReportConsumer {
    private static final Logger LOG = Logger.getLogger(SimulatedOperatorReportConsumer.class);
    private final List<ConductReportedEvent> consumedReports = new CopyOnWriteArrayList<>();
    @Incoming("conduct-reports-in")
    public CompletionStage<Void> consume(Message<ConductReportData> message) {
        ConductReportData data = message.getPayload();
        String type = message.getMetadata(IncomingCloudEventMetadata.class)
                .map(metadata -> ((IncomingCloudEventMetadata<?>) metadata).getType())
                .orElse(ConductReportedEvent.TYPE);
        consumedReports.add(new ConductReportedEvent(
                type,
                data.profileId(),
                data.connectionId(),
                data.recordId(),
                data.score(),
                data.timestamp()));
        LOG.infof("Simulated operator received conduct report '%s' for connection %s (score %d)",
                type, data.connectionId(), data.score());
        return message.ack();
    }
    public int consumedCount() {
        return consumedReports.size();
    }
    public ConductReportedEvent lastConsumed() {
        return consumedReports.isEmpty() ? null : consumedReports.get(consumedReports.size() - 1);
    }
    public void clear() {
        consumedReports.clear();
    }
}

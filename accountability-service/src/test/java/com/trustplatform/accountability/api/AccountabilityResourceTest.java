package com.trustplatform.accountability.api;

import com.trustplatform.accountability.client.ScoringClient;
import com.trustplatform.accountability.domain.AccountabilityStatus;
import com.trustplatform.accountability.domain.OffenceSource;
import com.trustplatform.accountability.domain.OffenceType;
import com.trustplatform.accountability.dto.AntiCheatVerdictRequest;
import com.trustplatform.accountability.dto.BanNotificationRequest;
import com.trustplatform.accountability.dto.ConductFeatureVector;
import com.trustplatform.accountability.dto.SampleSubmission;
import com.trustplatform.accountability.dto.ScoreResponse;
import com.trustplatform.accountability.dto.SimulateAntiCheatRequest;
import com.trustplatform.accountability.entity.AccountabilityRecord;
import com.trustplatform.accountability.entity.CaseEvent;
import com.trustplatform.accountability.entity.ExternalBan;
import com.trustplatform.accountability.entity.GameConnection;
import com.trustplatform.accountability.entity.PlayerProfile;
import com.trustplatform.accountability.event.ConductReportedEvent;
import com.trustplatform.accountability.event.SimulatedOperatorReportConsumer;
import com.trustplatform.accountability.event.ConductReportData;
import io.smallrye.reactive.messaging.ce.OutgoingCloudEventMetadata;
import io.smallrye.reactive.messaging.memory.InMemoryConnector;
import io.smallrye.reactive.messaging.memory.InMemorySink;
import io.smallrye.reactive.messaging.memory.InMemorySource;
import jakarta.enterprise.inject.Any;
import org.eclipse.microprofile.reactive.messaging.Message;
import com.trustplatform.accountability.repository.AccountabilityRecordRepository;
import com.trustplatform.accountability.repository.AntiCheatVerdictRepository;
import com.trustplatform.accountability.repository.AuditEntryRepository;
import com.trustplatform.accountability.repository.CaseEventRepository;
import com.trustplatform.accountability.repository.ExternalBanRepository;
import com.trustplatform.accountability.repository.GameConnectionRepository;
import com.trustplatform.accountability.repository.PlayerProfileRepository;
import io.smallrye.jwt.build.Jwt;
import io.quarkus.narayana.jta.QuarkusTransaction;
import io.quarkus.test.InjectMock;
import io.quarkus.test.junit.QuarkusTest;
import io.restassured.http.ContentType;
import io.smallrye.mutiny.Uni;
import org.eclipse.microprofile.rest.client.inject.RestClient;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.time.Duration;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Set;
import java.util.UUID;

import static io.restassured.RestAssured.given;
import static org.hamcrest.Matchers.hasSize;
import static org.hamcrest.Matchers.is;
import static org.hamcrest.Matchers.lessThan;
import static org.hamcrest.Matchers.nullValue;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.reset;
import static org.mockito.Mockito.when;

@QuarkusTest
class AccountabilityResourceTest {

    @InjectMock
    @RestClient
    ScoringClient scoringClient;

    @jakarta.inject.Inject
    PlayerProfileRepository playerProfileRepository;

    @jakarta.inject.Inject
    GameConnectionRepository gameConnectionRepository;

    @jakarta.inject.Inject
    AccountabilityRecordRepository accountabilityRecordRepository;

    @jakarta.inject.Inject
    CaseEventRepository caseEventRepository;

    @jakarta.inject.Inject
    AuditEntryRepository auditEntryRepository;

    @jakarta.inject.Inject
    ExternalBanRepository externalBanRepository;

    @jakarta.inject.Inject
    AntiCheatVerdictRepository antiCheatVerdictRepository;

    @jakarta.inject.Inject
    com.trustplatform.accountability.repository.TrustHistoryRepository trustHistoryRepository;

    @jakarta.inject.Inject
    SimulatedOperatorReportConsumer simulatedOperatorReportConsumer;
    @jakarta.inject.Inject
    @Any
    InMemoryConnector connector;

    @BeforeEach
    void setUp() {
        reset(scoringClient);
        simulatedOperatorReportConsumer.clear();
        connector.sink("conduct-reports-out").clear();
        QuarkusTransaction.requiringNew().run(() -> {
            caseEventRepository.deleteAll();
            auditEntryRepository.deleteAll();
            antiCheatVerdictRepository.deleteAll();
            externalBanRepository.deleteAll();
            accountabilityRecordRepository.deleteAll();
            gameConnectionRepository.deleteAll();
            trustHistoryRepository.deleteAll();
            playerProfileRepository.deleteAll();
        });
    }

    @Test
    void cleanSampleStoresNothingAndStillShowsTrust() {
        when(scoringClient.score(any())).thenReturn(Uni.createFrom().item(new ScoreResponse(18, 0.82, false, "none", 0.62, "conduct-rf-v1")));

        given()
                .contentType(ContentType.JSON)
                .header("X-Profile-Id", "sha256:player-1")
                .body(sample("gc-1", "op-1", "game-a"))
                .when().post("/samples")
                .then()
                .statusCode(200)
                .body("gameConnectionId", is("gc-1"))
                .body("globalTrustScore", is(100))
                .body("conductScore", nullValue())
                .body("status", nullValue())
                .body("caseHistory", hasSize(0))
                .body("auditTrail", hasSize(0))
                .body("crossGameSignals", hasSize(0));

        assertCounts(0, 0, 0, 0, 0);
    }

    @Test
    void flaggedSamplePublishesCloudEventAndKeepsPendingState() {
        when(scoringClient.score(any())).thenReturn(Uni.createFrom().item(new ScoreResponse(92, 0.91, true, "chatAbuse", 0.62, "conduct-rf-v1")));

        given()
                .contentType(ContentType.JSON)
                .header("X-Profile-Id", "sha256:player-1")
                .body(sample("gc-1", "op-1", "game-a"))
                .when().post("/samples")
                .then()
                .statusCode(200)
                .body("globalTrustScore", is(100))
                .body("conductScore", is(92))
                .body("status", is("pending"))
                .body("caseHistory", hasSize(1))
                .body("caseHistory[0].score", is(92))
                .body("caseHistory[0].offenceType", is("chatAbuse"))
                .body("caseHistory[0].source", is("conductEngine"))
                .body("caseHistory[0].status", is("pending"))
                .body("auditTrail", hasSize(1))
                .body("auditTrail[0].source", is("conductEngine"))
                .body("auditTrail[0].action", is("FLAGGED"));

        assertCounts(1, 1, 1, 1, 0);
        assertPendingState("gc-1");
        // A CloudEvent conduct-report is emitted to the outgoing (Kafka) channel.
        InMemorySink<ConductReportData> reports = connector.sink("conduct-reports-out");
        assertEquals(1, reports.received().size());
        Message<ConductReportData> message = reports.received().get(0);
        ConductReportData data = message.getPayload();
        assertEquals("sha256:player-1", data.profileId());
        assertEquals("gc-1", data.connectionId());
        assertEquals(92, data.score());
        assertEquals("chatAbuse", data.offenceType());
        OutgoingCloudEventMetadata<?> cloudEvent =
                message.getMetadata(OutgoingCloudEventMetadata.class).orElseThrow();
        assertEquals(ConductReportedEvent.TYPE, cloudEvent.getType());
        assertEquals("sha256:player-1", cloudEvent.getSubject().orElse(null));
    }

    @Test
    void flaggedSamplePropagatesScorerOffenceTypeToCloudEvent() {
        // The offence type is taken from the scorer response, not a hard-coded value.
        when(scoringClient.score(any())).thenReturn(
                Uni.createFrom().item(new ScoreResponse(90, 0.9, true, "voiceAbuse", 0.62, "conduct-rf-v1")));

        given()
                .contentType(ContentType.JSON)
                .header("X-Profile-Id", "sha256:player-1")
                .body(sample("gc-1", "op-1", "game-a"))
                .when().post("/samples")
                .then()
                .statusCode(200)
                .body("caseHistory[0].offenceType", is("voiceAbuse"));

        InMemorySink<ConductReportData> reports = connector.sink("conduct-reports-out");
        assertEquals(1, reports.received().size());
        assertEquals("voiceAbuse", reports.received().get(0).getPayload().offenceType());
    }

    @Test
    void flaggedSampleUsesContractOffenceTypeValueInCloudEvent() {
        when(scoringClient.score(any())).thenReturn(
                Uni.createFrom().item(new ScoreResponse(91, 0.9, true, "chatAbuse", 0.62, "conduct-rf-v1")));

        given()
                .contentType(ContentType.JSON)
                .header("X-Profile-Id", "sha256:player-1")
                .body(sample("gc-1", "op-1", "game-a"))
                .when().post("/samples")
                .then()
                .statusCode(200)
                .body("caseHistory[0].offenceType", is("chatAbuse"));

        InMemorySink<ConductReportData> reports = connector.sink("conduct-reports-out");
        assertEquals(1, reports.received().size());
        assertEquals("chatAbuse", reports.received().get(0).getPayload().offenceType());
    }

    @Test
    void simulatedOperatorConsumesConductReportCloudEvent() {
        InMemorySource<ConductReportData> source = connector.source("conduct-reports-in");
        ConductReportData data = new ConductReportData(
                "sha256:player-1", "gc-1", "rec-1", "chatAbuse", 92,
                "https://evidence.example/clip-1", Instant.now());
        source.send(data);
        awaitConsumed(1);
        assertEquals(1, simulatedOperatorReportConsumer.consumedCount());
        ConductReportedEvent consumed = simulatedOperatorReportConsumer.lastConsumed();
        assertNotNull(consumed);
        assertEquals(ConductReportedEvent.TYPE, consumed.type());
        assertEquals("gc-1", consumed.connectionId());
        assertEquals(92, consumed.score());
    }

    @Test
    void secondFlaggedSampleAppendsHistoryOnSameConnection() {
        when(scoringClient.score(any())).thenReturn(
                Uni.createFrom().item(new ScoreResponse(74, 0.77, true, "chatAbuse", 0.62, "conduct-rf-v1")),
                Uni.createFrom().item(new ScoreResponse(88, 0.89, true, "voiceAbuse", 0.62, "conduct-rf-v1")));

        given()
                .contentType(ContentType.JSON)
                .header("X-Profile-Id", "sha256:player-1")
                .body(sample("gc-1", "op-1", "game-a"))
                .when().post("/samples")
                .then()
                .statusCode(200);

        given()
                .contentType(ContentType.JSON)
                .header("X-Profile-Id", "sha256:player-1")
                .body(sample("gc-1", "op-1", "game-a"))
                .when().post("/samples")
                .then()
                .statusCode(200)
                .body("conductScore", is(88))
                .body("caseHistory", hasSize(2))
                .body("caseHistory[0].score", is(74))
                .body("caseHistory[1].score", is(88));

        assertCounts(1, 1, 1, 2, 0);
    }

    @Test
    void otherGameSummaryAppearsForDifferentConnection() {
        seedCrossGameSignalFixture();

        given()
                .header("X-Profile-Id", "sha256:player-1")
                .when().get("/results/gc-2")
                .then()
                .statusCode(200)
                .body("gameConnectionId", is("gc-2"))
                .body("globalTrustScore", is(70))
                .body("conductScore", nullValue())
                .body("caseHistory", hasSize(0))
                .body("crossGameSignals", hasSize(1))
                .body("crossGameSignals[0].operatorId", is("op-1"))
                .body("crossGameSignals[0].gameId", is("game-a"))
                .body("crossGameSignals[0].confirmedOffenceCount", is(1))
                .body("crossGameSignals[0].hasActiveBan", is(true));
    }

    @Test
    void banNotificationPersistsBanConfirmsPendingCaseAndUpdatesCrossGameSignals() {
        seedPendingBanFixture(80);

        given()
                .header("Authorization", "Bearer " + serviceToken())
                .contentType(ContentType.JSON)
                .body(banNotification("ban-1", -25))
                .when().post("/ban-notifications")
                .then()
                .statusCode(200)
                .body("status", is("ingested"))
                .body("banId", is("ban-1"))
                .body("profileId", is("sha256:player-1"))
                .body("globalTrustScore", is(55))
                .body("crossGameSignalsUpdated", is(true));

        assertCounts(1, 2, 1, 1, 1);
        assertConfirmedState("gc-1", 55);

        given()
                .header("X-Profile-Id", "sha256:player-1")
                .when().get("/results/gc-2")
                .then()
                .statusCode(200)
                .body("crossGameSignals", hasSize(1))
                .body("crossGameSignals[0].operatorId", is("op-1"))
                .body("crossGameSignals[0].gameId", is("game-a"))
                .body("crossGameSignals[0].confirmedOffenceCount", is(1))
                .body("crossGameSignals[0].hasActiveBan", is(true));
    }

    @Test
    void duplicateBanNotificationIsIdempotent() {
        seedPendingBanFixture(90);

        given()
                .header("Authorization", "Bearer " + serviceToken())
                .contentType(ContentType.JSON)
                .body(banNotification("ban-dup", -20))
                .when().post("/ban-notifications")
                .then()
                .statusCode(200)
                .body("status", is("ingested"))
                .body("globalTrustScore", is(70));

        given()
                .header("Authorization", "Bearer " + serviceToken())
                .contentType(ContentType.JSON)
                .body(banNotification("ban-dup", -20))
                .when().post("/ban-notifications")
                .then()
                .statusCode(200)
                .body("status", is("duplicate"))
                .body("globalTrustScore", is(70));

        assertCounts(1, 2, 1, 1, 1);
        assertConfirmedState("gc-1", 70);
    }

    @Test
    void futureDatedBanNotificationDoesNotReportActiveBanYet() {
        seedPendingBanFixture(90);

        given()
                .header("Authorization", "Bearer " + serviceToken())
                .contentType(ContentType.JSON)
                .body(new BanNotificationRequest(
                        "ban-future",
                        "sha256:player-1",
                        "gc-1",
                        "op-1",
                        "game-a",
                        "aimbot confirmed",
                        Instant.now().plus(1, ChronoUnit.DAYS),
                        Instant.now().plus(8, ChronoUnit.DAYS),
                        -20,
                        "temporary",
                        true))
                .when().post("/ban-notifications")
                .then()
                .statusCode(200)
                .body("status", is("ingested"))
                .body("crossGameSignalsUpdated", is(false));
    }

    @Test
    void banNotificationRejectsOperatorTokenForDifferentOperator() {
        seedPendingBanFixture(90);

        given()
                .header("Authorization", "Bearer " + operatorToken("op-2"))
                .contentType(ContentType.JSON)
                .body(banNotification("ban-mismatch", -20))
                .when().post("/ban-notifications")
                .then()
                .statusCode(403);

        assertCounts(1, 2, 1, 1, 0);
    }

    @Test
    void antiCheatVerdictIsIngestedConfirmedAuditedAndLowersTrust() {
        seedLinkedConnection(80);

        given()
                .header("Authorization", "Bearer " + serviceToken())
                .contentType(ContentType.JSON)
                .body(antiCheatVerdict("verdict-1", "aimbot", 0.97, -30))
                .when().post("/anti-cheat-verdicts")
                .then()
                .statusCode(200)
                .body("status", is("ingested"))
                .body("verdictId", is("verdict-1"))
                .body("profileId", is("sha256:player-1"))
                .body("globalTrustScore", is(50));

        // The verdict is recorded as a CONFIRMED, anti-cheat-sourced case with an audit entry.
        given()
                .header("X-Profile-Id", "sha256:player-1")
                .when().get("/results/gc-1")
                .then()
                .statusCode(200)
                .body("status", is("confirmed"))
                .body("caseHistory", hasSize(1))
                .body("caseHistory[0].offenceType", is("aimbot"))
                .body("caseHistory[0].source", is("antiCheat"))
                .body("caseHistory[0].status", is("confirmed"))
                .body("auditTrail", hasSize(1))
                .body("auditTrail[0].source", is("antiCheat"))
                .body("auditTrail[0].action", is("VERDICT_CONFIRMED"));
    }

    @Test
    void duplicateAntiCheatVerdictIsIdempotent() {
        seedLinkedConnection(80);

        given()
                .header("Authorization", "Bearer " + serviceToken())
                .contentType(ContentType.JSON)
                .body(antiCheatVerdict("verdict-dup", "aimbot", 0.9, -30))
                .when().post("/anti-cheat-verdicts")
                .then()
                .statusCode(200)
                .body("status", is("ingested"))
                .body("globalTrustScore", is(50));

        given()
                .header("Authorization", "Bearer " + serviceToken())
                .contentType(ContentType.JSON)
                .body(antiCheatVerdict("verdict-dup", "aimbot", 0.9, -30))
                .when().post("/anti-cheat-verdicts")
                .then()
                .statusCode(200)
                .body("status", is("duplicate"))
                .body("globalTrustScore", is(50));

        QuarkusTransaction.requiringNew().run(() -> {
            assertEquals(1, antiCheatVerdictRepository.count());
            assertEquals(1, caseEventRepository.count());
        });
    }

    @Test
    void simulatedAntiCheatVendorDemoHookProducesConfirmedAuditedCaseAndLowersTrust() {
        // Dev/test-only hook: the in-module simulated vendor issues a verdict against the caller's own
        // connection (no fixture needed — the profile/connection are upserted at default trust 100).
        given()
                .header("Authorization", "Bearer " + playerToken("sha256:player-1"))
                .contentType(ContentType.JSON)
                .body(new SimulateAntiCheatRequest("gc-1", "op-1", "game-a"))
                .when().post("/dev/anti-cheat-verdicts/simulate")
                .then()
                .statusCode(200)
                .body("gameConnectionId", is("gc-1"))
                .body("status", is("confirmed"))
                .body("caseHistory", hasSize(1))
                .body("caseHistory[0].source", is("antiCheat"))
                .body("caseHistory[0].status", is("confirmed"))
                .body("auditTrail", hasSize(1))
                .body("auditTrail[0].source", is("antiCheat"))
                .body("auditTrail[0].action", is("VERDICT_CONFIRMED"))
                .body("globalTrustScore", lessThan(100));

        QuarkusTransaction.requiringNew().run(() -> {
            assertEquals(1, antiCheatVerdictRepository.count());
            assertEquals(1, caseEventRepository.count());
        });
    }

    @Test
    void unknownAntiCheatOffenceTypeFallsBackToNone() {
        seedLinkedConnection(80);

        given()
                .header("Authorization", "Bearer " + serviceToken())
                .contentType(ContentType.JSON)
                .body(antiCheatVerdict("verdict-unknown", "customVendorHeuristic", 0.95, -20))
                .when().post("/anti-cheat-verdicts")
                .then()
                .statusCode(200)
                .body("status", is("ingested"))
                .body("globalTrustScore", is(60));

        given()
                .header("X-Profile-Id", "sha256:player-1")
                .when().get("/results/gc-1")
                .then()
                .statusCode(200)
                .body("caseHistory", hasSize(1))
                .body("caseHistory[0].offenceType", is("none"));
    }

    @Test
    void flaggedSampleDoesNotDowngradeConfirmedRecord() {
        seedLinkedConnection(80);

        given()
                .header("Authorization", "Bearer " + serviceToken())
                .contentType(ContentType.JSON)
                .body(antiCheatVerdict("verdict-confirmed-first", "aimbot", 0.97, -30))
                .when().post("/anti-cheat-verdicts")
                .then()
                .statusCode(200);

        when(scoringClient.score(any())).thenReturn(
                Uni.createFrom().item(new ScoreResponse(89, 0.9, true, "chatAbuse", 0.62, "conduct-rf-v1")));

        given()
                .contentType(ContentType.JSON)
                .header("X-Profile-Id", "sha256:player-1")
                .body(sample("gc-1", "op-1", "game-a"))
                .when().post("/samples")
                .then()
                .statusCode(200)
                .body("status", is("confirmed"))
                .body("caseHistory", hasSize(2))
                .body("caseHistory[1].status", is("pending"));
    }

    private void awaitConsumed(int expected) {
        long deadline = System.currentTimeMillis() + 5000;
        while (simulatedOperatorReportConsumer.consumedCount() < expected
                && System.currentTimeMillis() < deadline) {
            try {
                Thread.sleep(25);
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
                break;
            }
        }
    }
    private SampleSubmission sample(String connectionId, String operatorId, String gameId) {
        return new SampleSubmission(
                connectionId,
                operatorId,
                gameId,
                new ConductFeatureVector("text", 0.92, 0.88, 0.85, 0.70, 0.40, 0.55),
                "https://evidence.example/clip-1"
        );
    }

    private BanNotificationRequest banNotification(String banId, int trustDelta) {
        return new BanNotificationRequest(
                banId,
                "sha256:player-1",
                "gc-1",
                "op-1",
                "game-a",
                "aimbot confirmed",
                Instant.now().minus(5, ChronoUnit.MINUTES),
                Instant.now().plus(7, ChronoUnit.DAYS),
                trustDelta,
                "temporary",
                true
        );
    }

    private AntiCheatVerdictRequest antiCheatVerdict(String verdictId, String offenceType, double confidence, int trustDelta) {
        return new AntiCheatVerdictRequest(
                verdictId,
                "sha256:player-1",
                "gc-1",
                "op-1",
                "game-a",
                offenceType,
                confidence,
                "https://evidence.example/clip-ac",
                Instant.now().minus(2, ChronoUnit.MINUTES),
                trustDelta
        );
    }

    private String serviceToken() {
        return Jwt.issuer("trust-platform")
                .subject("service:operator-gateway")
                .groups(Set.of("service"))
                .expiresIn(Duration.ofHours(1))
                .sign();
    }

    private String operatorToken(String operatorId) {
        return Jwt.issuer("trust-platform")
                .subject("operator:" + operatorId)
                .groups(Set.of("operator"))
                .claim("operatorId", operatorId)
                .expiresIn(Duration.ofHours(1))
                .sign();
    }

    private String playerToken(String profileId) {
        return Jwt.issuer("trust-platform")
                .subject(profileId)
                .groups(Set.of("player"))
                .expiresIn(Duration.ofHours(1))
                .sign();
    }

    private void seedLinkedConnection(int trustScore) {
        QuarkusTransaction.requiringNew().run(() -> {
            PlayerProfile profile = new PlayerProfile();
            profile.profileId = "sha256:player-1";
            profile.globalTrustScore = trustScore;
            playerProfileRepository.persist(profile);

            GameConnection connection = new GameConnection();
            connection.connectionId = "gc-1";
            connection.profile = profile;
            connection.operatorId = "op-1";
            connection.gameId = "game-a";
            gameConnectionRepository.persist(connection);
        });
    }

    private void seedPendingBanFixture(int trustScore) {
        QuarkusTransaction.requiringNew().run(() -> {
            PlayerProfile profile = new PlayerProfile();
            profile.profileId = "sha256:player-1";
            profile.globalTrustScore = trustScore;
            playerProfileRepository.persist(profile);

            GameConnection currentConnection = new GameConnection();
            currentConnection.connectionId = "gc-2";
            currentConnection.profile = profile;
            currentConnection.operatorId = "op-2";
            currentConnection.gameId = "game-b";
            gameConnectionRepository.persist(currentConnection);

            GameConnection flaggedConnection = new GameConnection();
            flaggedConnection.connectionId = "gc-1";
            flaggedConnection.profile = profile;
            flaggedConnection.operatorId = "op-1";
            flaggedConnection.gameId = "game-a";
            gameConnectionRepository.persist(flaggedConnection);

            AccountabilityRecord record = new AccountabilityRecord();
            record.recordId = UUID.randomUUID().toString();
            record.connection = flaggedConnection;
            record.profileId = profile.profileId;
            record.operatorId = flaggedConnection.operatorId;
            record.gameId = flaggedConnection.gameId;
            record.conductScore = 93;
            record.status = AccountabilityStatus.PENDING;
            accountabilityRecordRepository.persist(record);

            CaseEvent event = new CaseEvent();
            event.record = record;
            event.occurredAt = Instant.now().minus(1, ChronoUnit.HOURS);
            event.offenceType = OffenceType.CHAT_ABUSE;
            event.source = OffenceSource.CONDUCT_ENGINE;
            event.score = 93;
            event.evidenceLink = "https://evidence.example/clip-3";
            event.status = AccountabilityStatus.PENDING;
            caseEventRepository.persist(event);
        });
    }

    private void seedCrossGameSignalFixture() {
        QuarkusTransaction.requiringNew().run(() -> {
            PlayerProfile profile = new PlayerProfile();
            profile.profileId = "sha256:player-1";
            profile.globalTrustScore = 70;
            playerProfileRepository.persist(profile);

            GameConnection currentConnection = new GameConnection();
            currentConnection.connectionId = "gc-2";
            currentConnection.profile = profile;
            currentConnection.operatorId = "op-2";
            currentConnection.gameId = "game-b";
            gameConnectionRepository.persist(currentConnection);

            GameConnection otherConnection = new GameConnection();
            otherConnection.connectionId = "gc-1";
            otherConnection.profile = profile;
            otherConnection.operatorId = "op-1";
            otherConnection.gameId = "game-a";
            gameConnectionRepository.persist(otherConnection);

            AccountabilityRecord record = new AccountabilityRecord();
            record.recordId = UUID.randomUUID().toString();
            record.connection = otherConnection;
            record.profileId = profile.profileId;
            record.operatorId = otherConnection.operatorId;
            record.gameId = otherConnection.gameId;
            record.conductScore = 93;
            record.status = AccountabilityStatus.CONFIRMED;
            accountabilityRecordRepository.persist(record);

            CaseEvent event = new CaseEvent();
            event.record = record;
            event.occurredAt = Instant.now().minus(1, ChronoUnit.DAYS);
            event.offenceType = OffenceType.CHAT_ABUSE;
            event.source = OffenceSource.CONDUCT_ENGINE;
            event.score = 93;
            event.evidenceLink = "https://evidence.example/clip-2";
            event.status = AccountabilityStatus.CONFIRMED;
            caseEventRepository.persist(event);

            ExternalBan externalBan = new ExternalBan();
            externalBan.banId = "ban-1";
            externalBan.profileId = profile.profileId;
            externalBan.connectionId = otherConnection.connectionId;
            externalBan.operatorId = otherConnection.operatorId;
            externalBan.gameId = otherConnection.gameId;
            externalBan.reason = "aimbot confirmed";
            externalBan.bannedAt = Instant.now().minus(12, ChronoUnit.HOURS);
            externalBan.expiresAt = Instant.now().plus(7, ChronoUnit.DAYS);
            externalBan.trustDelta = -30;
            externalBanRepository.persist(externalBan);
        });
    }

    private void assertPendingState(String connectionId) {
        QuarkusTransaction.requiringNew().run(() -> {
            AccountabilityRecord record = accountabilityRecordRepository.findByConnectionId(connectionId);
            assertNotNull(record);
            assertEquals(AccountabilityStatus.PENDING, record.status);

            CaseEvent latestCaseEvent = caseEventRepository.findLatestByRecordId(record.recordId);
            assertNotNull(latestCaseEvent);
            assertEquals(AccountabilityStatus.PENDING, latestCaseEvent.status);
        });
    }

    private void assertConfirmedState(String connectionId, int expectedTrustScore) {
        QuarkusTransaction.requiringNew().run(() -> {
            AccountabilityRecord record = accountabilityRecordRepository.findByConnectionId(connectionId);
            assertNotNull(record);
            assertEquals(AccountabilityStatus.CONFIRMED, record.status);

            CaseEvent latestCaseEvent = caseEventRepository.findLatestByRecordId(record.recordId);
            assertNotNull(latestCaseEvent);
            assertEquals(AccountabilityStatus.CONFIRMED, latestCaseEvent.status);

            PlayerProfile profile = playerProfileRepository.findById("sha256:player-1");
            assertNotNull(profile);
            assertEquals(expectedTrustScore, profile.globalTrustScore);
        });
    }

    private void assertCounts(long profiles, long connections, long records, long caseEvents, long bans) {
        QuarkusTransaction.requiringNew().run(() -> {
            assertEquals(profiles, playerProfileRepository.count());
            assertEquals(connections, gameConnectionRepository.count());
            assertEquals(records, accountabilityRecordRepository.count());
            assertEquals(caseEvents, caseEventRepository.count());
            assertEquals(bans, externalBanRepository.count());
        });
    }
}

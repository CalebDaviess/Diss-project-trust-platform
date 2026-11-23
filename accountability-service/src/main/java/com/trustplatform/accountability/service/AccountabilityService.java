package com.trustplatform.accountability.service;

import com.trustplatform.accountability.client.ScoringClient;
import com.trustplatform.accountability.domain.AccountabilityStatus;
import com.trustplatform.accountability.domain.OffenceSource;
import com.trustplatform.accountability.domain.OffenceType;
import com.trustplatform.accountability.dto.AntiCheatVerdictRequest;
import com.trustplatform.accountability.dto.AntiCheatVerdictResponse;
import com.trustplatform.accountability.dto.AuditView;
import com.trustplatform.accountability.dto.BanNotificationRequest;
import com.trustplatform.accountability.dto.BanNotificationResponse;
import com.trustplatform.accountability.dto.CaseView;
import com.trustplatform.accountability.dto.CrossGameSignalView;
import com.trustplatform.accountability.dto.ResultView;
import com.trustplatform.accountability.dto.SampleSubmission;
import com.trustplatform.accountability.dto.ScoreRequest;
import com.trustplatform.accountability.dto.ScoreResponse;
import com.trustplatform.accountability.dto.SimulateAntiCheatRequest;
import com.trustplatform.accountability.entity.AccountabilityRecord;
import com.trustplatform.accountability.entity.AntiCheatVerdict;
import com.trustplatform.accountability.entity.AuditEntry;
import com.trustplatform.accountability.entity.CaseEvent;
import com.trustplatform.accountability.entity.ExternalBan;
import com.trustplatform.accountability.entity.GameConnection;
import com.trustplatform.accountability.entity.PlayerProfile;
import com.trustplatform.accountability.event.ConductReportData;
import com.trustplatform.accountability.event.ConductReportPublisher;
import com.trustplatform.accountability.repository.AccountabilityRecordRepository;
import com.trustplatform.accountability.repository.AntiCheatVerdictRepository;
import com.trustplatform.accountability.repository.AuditEntryRepository;
import com.trustplatform.accountability.repository.CaseEventRepository;
import com.trustplatform.accountability.repository.ExternalBanRepository;
import com.trustplatform.accountability.repository.GameConnectionRepository;
import com.trustplatform.accountability.repository.PlayerProfileRepository;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.persistence.EntityManager;
import jakarta.transaction.Transactional;
import jakarta.ws.rs.BadRequestException;
import jakarta.ws.rs.NotFoundException;
import org.eclipse.microprofile.rest.client.inject.RestClient;

import java.time.Duration;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

@ApplicationScoped
public class AccountabilityService {

    private static final Duration SCORE_TIMEOUT = Duration.ofSeconds(5);
    private static final int MIN_TRUST_SCORE = 0;
    private static final int MAX_TRUST_SCORE = 100;

    private final ScoringClient scoringClient;
    private final ConductReportPublisher conductReportPublisher;
    private final SimulatedAntiCheatVendor simulatedAntiCheatVendor;
    private final PlayerProfileRepository playerProfileRepository;
    private final GameConnectionRepository gameConnectionRepository;
    private final AccountabilityRecordRepository accountabilityRecordRepository;
    private final CaseEventRepository caseEventRepository;
    private final AuditEntryRepository auditEntryRepository;
    private final ExternalBanRepository externalBanRepository;
    private final AntiCheatVerdictRepository antiCheatVerdictRepository;
    private final TrustHistoryRecorder trustHistoryRecorder;
    private final EntityManager entityManager;

    public AccountabilityService(
            @RestClient ScoringClient scoringClient,
            ConductReportPublisher conductReportPublisher,
            SimulatedAntiCheatVendor simulatedAntiCheatVendor,
            PlayerProfileRepository playerProfileRepository,
            GameConnectionRepository gameConnectionRepository,
            AccountabilityRecordRepository accountabilityRecordRepository,
            CaseEventRepository caseEventRepository,
            AuditEntryRepository auditEntryRepository,
            ExternalBanRepository externalBanRepository,
            AntiCheatVerdictRepository antiCheatVerdictRepository,
            TrustHistoryRecorder trustHistoryRecorder,
            EntityManager entityManager) {
        this.scoringClient = scoringClient;
        this.conductReportPublisher = conductReportPublisher;
        this.simulatedAntiCheatVendor = simulatedAntiCheatVendor;
        this.playerProfileRepository = playerProfileRepository;
        this.gameConnectionRepository = gameConnectionRepository;
        this.accountabilityRecordRepository = accountabilityRecordRepository;
        this.caseEventRepository = caseEventRepository;
        this.auditEntryRepository = auditEntryRepository;
        this.externalBanRepository = externalBanRepository;
        this.antiCheatVerdictRepository = antiCheatVerdictRepository;
        this.trustHistoryRecorder = trustHistoryRecorder;
        this.entityManager = entityManager;
    }

    /**
     * Score a conduct sample (toxic chat/voice) with the platform's own ML conduct engine. A flag
     * opens a {@code pending}, source-attributed case for human review — the platform never
     * auto-confirms its own detector (contrast: external anti-cheat verdicts, which are confirmed).
     */
    @Transactional
    public ResultView submitSample(String profileId, SampleSubmission submission) {
        ScoreResponse scoreResponse = scoringClient.score(new ScoreRequest(profileId, submission.features()))
                .await().atMost(SCORE_TIMEOUT);

        if (!scoreResponse.flagged()) {
            return buildResultView(profileId, submission.gameConnectionId());
        }

        int conductScore = scoreResponse.toxicityScore();
        PlayerProfile profile = upsertProfile(profileId);
        GameConnection connection = upsertConnection(
                profile, submission.gameConnectionId(), submission.operatorId(), submission.gameId());
        AccountabilityRecord record = findOrCreateRecord(connection, conductScore);
        record.conductScore = conductScore;
        record.status = AccountabilityStatus.PENDING;

        CaseEvent caseEvent = buildCaseEvent(
                conductScore,
                scoreResponse.offenceType(),
                OffenceSource.CONDUCT_ENGINE,
                submission.evidenceLink(),
                AccountabilityStatus.PENDING);
        record.addCaseEvent(caseEvent);

        appendAudit(record, OffenceSource.CONDUCT_ENGINE, "conduct-engine", "FLAGGED",
                caseEvent.offenceType.value() + " flagged for review (score " + conductScore + ")");

        conductReportPublisher.publish(new ConductReportData(
                profile.profileId,
                connection.connectionId,
                record.recordId,
                caseEvent.offenceType.value(),
                conductScore,
                caseEvent.evidenceLink,
                caseEvent.occurredAt));

        return buildResultView(profile.profileId, connection.connectionId);
    }

    @Transactional
    public ResultView getResult(String profileId, String connectionId) {
        GameConnection connection = gameConnectionRepository.findById(connectionId);
        if (connection != null && !connection.profile.profileId.equals(profileId)) {
            throw new NotFoundException("Connection not found");
        }
        return buildResultView(profileId, connectionId);
    }

    @Transactional
    public BanNotificationResponse ingestBanNotification(BanNotificationRequest request) {
        GameConnection connection = gameConnectionRepository.findById(request.connectionId());
        if (connection == null) {
            throw new NotFoundException("Connection not found");
        }
        validateConnectionOwnership(connection, request.profileId(), request.operatorId(), request.gameId());

        ExternalBan existingBan = externalBanRepository.findById(request.banId());
        if (existingBan != null) {
            validateExistingBan(existingBan, request);
            return new BanNotificationResponse(
                    "duplicate",
                    existingBan.banId,
                    existingBan.profileId,
                    connection.profile.globalTrustScore,
                    externalBanRepository.hasActiveBan(connection.connectionId, Instant.now()));
        }

        ExternalBan ban = new ExternalBan();
        ban.banId = request.banId();
        ban.profileId = request.profileId();
        ban.connectionId = request.connectionId();
        ban.operatorId = request.operatorId();
        ban.gameId = request.gameId();
        ban.reason = request.reason();
        ban.bannedAt = request.bannedAt();
        ban.expiresAt = request.expiresAt();
        ban.trustDelta = request.trustDelta();
        ban.banType = request.banType() == null || request.banType().isBlank() ? "temporary" : request.banType().trim();
        ban.appealable = request.appealable() == null || request.appealable();
        externalBanRepository.persist(ban);

        PlayerProfile profile = connection.profile;
        profile.globalTrustScore = clampTrustScore(profile.globalTrustScore + request.trustDelta());
        trustHistoryRecorder.record(profile.profileId, profile.globalTrustScore, "ban");

        // A ban is a confirmed sanction, so it must show on the record as a confirmed offence.
        // Ensure a record exists, confirm it, and confirm any pending conduct cases the ban upholds.
        AccountabilityRecord record = findOrCreateRecord(connection, 0);
        record.status = AccountabilityStatus.CONFIRMED;
        caseEventRepository.listPendingByConnectionId(connection.connectionId)
                .forEach(event -> event.status = AccountabilityStatus.CONFIRMED);
        // If the ban does not confirm an existing offence (e.g. a direct report → ban with no prior
        // conduct case), record the ban itself as a confirmed offence so it counts on the tally.
        if (caseEventRepository.listByRecordId(record.recordId).isEmpty()) {
            CaseEvent banEvent = buildCaseEvent(
                    0, banOffenceType(ban.banType), OffenceSource.OPERATOR, null,
                    AccountabilityStatus.CONFIRMED);
            banEvent.occurredAt = request.bannedAt() == null ? Instant.now() : request.bannedAt();
            record.addCaseEvent(banEvent);
        }
        appendAudit(record, OffenceSource.OPERATOR, "operator:" + request.operatorId(), "BAN",
                request.reason() == null ? "Operator ban" : request.reason());

        return new BanNotificationResponse(
                "ingested",
                ban.banId,
                ban.profileId,
                profile.globalTrustScore,
                ban.isActiveAt(Instant.now()));
    }

    /**
     * Ingest a verdict from an external third-party anti-cheat vendor (Anti-Cheat-Integration.md).
     *
     * <p>Cheating is detected OUTSIDE the platform. Because the vendor is a trusted specialist the
     * verdict is recorded {@code confirmed} (never re-adjudicated here) — the player may appeal
     * afterwards. Ingest is idempotent on {@code verdictId}, fully audited, and adjusts global trust.
     * This deliberate <em>detection-source asymmetry</em> (external → confirmed, own conduct engine
     * → pending) is examined in Governance / SQ3.
     */
    @Transactional
    public AntiCheatVerdictResponse ingestAntiCheatVerdict(AntiCheatVerdictRequest request) {
        GameConnection connection = gameConnectionRepository.findById(request.connectionId());
        if (connection == null) {
            throw new NotFoundException("Connection not found");
        }
        validateConnectionOwnership(connection, request.profileId(), request.operatorId(), request.gameId());

        AntiCheatVerdict existing = antiCheatVerdictRepository.findById(request.verdictId());
        if (existing != null) {
            validateExistingVerdict(existing, request);
            AccountabilityRecord existingRecord =
                    accountabilityRecordRepository.findByConnectionId(connection.connectionId);
            return new AntiCheatVerdictResponse(
                    "duplicate",
                    existing.verdictId,
                    existing.profileId,
                    existingRecord == null ? null : existingRecord.recordId,
                    connection.profile.globalTrustScore);
        }

        AntiCheatVerdict verdict = new AntiCheatVerdict();
        verdict.verdictId = request.verdictId();
        verdict.profileId = request.profileId();
        verdict.connectionId = request.connectionId();
        verdict.operatorId = request.operatorId();
        verdict.gameId = request.gameId();
        verdict.offenceType = request.offenceType();
        verdict.confidence = request.confidence();
        verdict.evidenceLink = request.evidenceLink();
        verdict.detectedAt = request.detectedAt();
        verdict.trustDelta = request.trustDelta();
        antiCheatVerdictRepository.persist(verdict);

        PlayerProfile profile = connection.profile;
        profile.globalTrustScore = clampTrustScore(profile.globalTrustScore + request.trustDelta());
        trustHistoryRecorder.record(profile.profileId, profile.globalTrustScore, "anti-cheat");

        // Anti-cheat verdicts never originate a conduct score; a fresh record starts at 0 conduct.
        AccountabilityRecord record = findOrCreateRecord(connection, 0);
        record.status = AccountabilityStatus.CONFIRMED;

        int caseScore = (int) Math.round(clampConfidence(request.confidence()) * 100.0);
        CaseEvent caseEvent = buildCaseEvent(
                caseScore,
                request.offenceType(),
                OffenceSource.ANTI_CHEAT,
                request.evidenceLink(),
                AccountabilityStatus.CONFIRMED);
        caseEvent.occurredAt = request.detectedAt();
        record.addCaseEvent(caseEvent);

        appendAudit(record, OffenceSource.ANTI_CHEAT, "anti-cheat:" + request.operatorId(),
                "VERDICT_CONFIRMED",
                caseEvent.offenceType.value() + " (vendor confidence " + request.confidence() + ")");

        return new AntiCheatVerdictResponse(
                "ingested",
                verdict.verdictId,
                verdict.profileId,
                record.recordId,
                profile.globalTrustScore);
    }

    /**
     * Dev/test demo helper: let the in-module {@link SimulatedAntiCheatVendor} issue a verdict against
     * the caller's own connection, so the anti-cheat → confirmed → audited → trust-drop flow is
     * demonstrable from the portal without a real vendor. The profile/connection are upserted first so
     * it works even before any conduct sample exists. Guarded by the resource (the demo config flag);
     * never reachable in production.
     */
    @Transactional
    public ResultView simulateAntiCheatVerdict(String profileId, SimulateAntiCheatRequest request) {
        String connectionId = blankOr(request == null ? null : request.connectionId(), "gc-1");
        String operatorId = blankOr(request == null ? null : request.operatorId(), "op-1");
        String gameId = blankOr(request == null ? null : request.gameId(), "game-a");

        PlayerProfile profile = upsertProfile(profileId);
        upsertConnection(profile, connectionId, operatorId, gameId);

        ingestAntiCheatVerdict(
                simulatedAntiCheatVendor.issueVerdict(profileId, connectionId, operatorId, gameId));
        return buildResultView(profileId, connectionId);
    }

    /**
     * Dev/test demo hook: simulate a typed operator ban on the player's own connection so the portal
     * can show ban categories, durations and appealability. Mirrors a real {@code ban-notification}
     * but is triggered by the player (gated by a demo flag at the resource).
     */
    @Transactional
    public ResultView simulateOperatorBan(String profileId, String connectionId, String banType,
                                          Integer durationDays, boolean appealable) {
        GameConnection connection = gameConnectionRepository.findById(connectionId);
        if (connection == null || !connection.profile.profileId.equals(profileId)) {
            throw new NotFoundException("Connection not found");
        }

        Instant now = Instant.now();
        String type = banType == null || banType.isBlank() ? "temporary" : banType.trim();
        Instant expiresAt = "permanent".equals(type) || durationDays == null
                ? null : now.plus(java.time.Duration.ofDays(durationDays));
        int trustDelta = switch (type) {
            case "communication" -> -8;
            case "permanent" -> -35;
            default -> -15;
        };
        String reason = switch (type) {
            case "communication" -> "Communication ban (abusive chat/voice)";
            case "permanent" -> "Permanent ban";
            default -> "Temporary suspension";
        };
        ingestBanNotification(new BanNotificationRequest(
                "ban-" + UUID.randomUUID(), profileId, connectionId, connection.operatorId, connection.gameId,
                reason, now, expiresAt, trustDelta, type, appealable));
        return buildResultView(profileId, connectionId);
    }

    private static String blankOr(String value, String fallback) {
        return value == null || value.isBlank() ? fallback : value.trim();
    }

    private PlayerProfile upsertProfile(String profileId) {
        entityManager.createNativeQuery(
                        "merge into player_profile target "
                                + "using (values (?1, ?2)) source(profile_id, global_trust_score) "
                                + "on target.profile_id = source.profile_id "
                                + "when not matched then "
                                + "insert (profile_id, global_trust_score) values (source.profile_id, source.global_trust_score)")
                .setParameter(1, profileId)
                .setParameter(2, PlayerProfile.DEFAULT_GLOBAL_TRUST_SCORE)
                .executeUpdate();
        return playerProfileRepository.findById(profileId);
    }

    private GameConnection upsertConnection(PlayerProfile profile, String connectionId,
                                            String operatorId, String gameId) {
        entityManager.createNativeQuery(
                        "merge into game_connection target "
                                + "using (values (?1, ?2, ?3, ?4)) source(connection_id, profile_id, operator_id, game_id) "
                                + "on target.connection_id = source.connection_id "
                                + "when not matched then "
                                + "insert (connection_id, profile_id, operator_id, game_id) "
                                + "values (source.connection_id, source.profile_id, source.operator_id, source.game_id)")
                .setParameter(1, connectionId)
                .setParameter(2, profile.profileId)
                .setParameter(3, operatorId)
                .setParameter(4, gameId)
                .executeUpdate();
        GameConnection connection = gameConnectionRepository.findById(connectionId);
        if (!connection.profile.profileId.equals(profile.profileId)
                || !connection.operatorId.equals(operatorId)
                || !connection.gameId.equals(gameId)) {
            throw new BadRequestException("Submitted connection details do not match the existing connection");
        }
        return connection;
    }

    private void validateConnectionOwnership(GameConnection connection, String profileId, String operatorId, String gameId) {
        if (!connection.profile.profileId.equals(profileId)
                || !connection.operatorId.equals(operatorId)
                || !connection.gameId.equals(gameId)) {
            throw new BadRequestException("Submitted connection details do not match the existing connection");
        }
    }

    private void validateExistingBan(ExternalBan existingBan, BanNotificationRequest request) {
        if (!existingBan.profileId.equals(request.profileId())
                || !existingBan.connectionId.equals(request.connectionId())
                || !existingBan.operatorId.equals(request.operatorId())
                || !existingBan.gameId.equals(request.gameId())) {
            throw new BadRequestException("Submitted ban details do not match the existing ban");
        }
    }

    private void validateExistingVerdict(AntiCheatVerdict existingVerdict, AntiCheatVerdictRequest request) {
        if (!existingVerdict.profileId.equals(request.profileId())
                || !existingVerdict.connectionId.equals(request.connectionId())
                || !existingVerdict.operatorId.equals(request.operatorId())
                || !existingVerdict.gameId.equals(request.gameId())) {
            throw new BadRequestException("Submitted verdict details do not match the existing verdict");
        }
    }

    /**
     * Find the record for a connection, creating it (status {@code pending}, the given conduct score)
     * only if it does not yet exist. Never clobbers an existing record's score/status — callers set
     * those explicitly for their flow (conduct → pending; anti-cheat → confirmed).
     */
    private AccountabilityRecord findOrCreateRecord(GameConnection connection, int initialConductScore) {
        entityManager.createNativeQuery(
                        "merge into accountability_record target "
                                + "using (values (?1, ?2, ?3, ?4, ?5, ?6, ?7)) "
                                + "source(record_id, connection_id, profile_id, operator_id, game_id, conduct_score, status) "
                                + "on target.connection_id = source.connection_id "
                                + "when not matched then "
                                + "insert (record_id, connection_id, profile_id, operator_id, game_id, conduct_score, status) "
                                + "values (source.record_id, source.connection_id, source.profile_id, source.operator_id, "
                                + "source.game_id, source.conduct_score, source.status)")
                .setParameter(1, UUID.randomUUID().toString())
                .setParameter(2, connection.connectionId)
                .setParameter(3, connection.profile.profileId)
                .setParameter(4, connection.operatorId)
                .setParameter(5, connection.gameId)
                .setParameter(6, initialConductScore)
                .setParameter(7, AccountabilityStatus.PENDING.name())
                .executeUpdate();
        return accountabilityRecordRepository.findByConnectionId(connection.connectionId);
    }

    /** Map an operator ban type to the offence recorded on the accountability record. */
    private static String banOffenceType(String banType) {
        return "communication".equalsIgnoreCase(banType) ? "chatAbuse" : "misconduct";
    }

    private CaseEvent buildCaseEvent(int score, String offenceType, OffenceSource source,
                                     String evidenceLink, AccountabilityStatus status) {
        CaseEvent event = new CaseEvent();
        event.occurredAt = Instant.now();
        event.offenceType = resolveOffenceType(offenceType);
        event.source = source;
        event.score = score;
        event.evidenceLink = evidenceLink;
        event.status = status;
        return event;
    }

    private void appendAudit(AccountabilityRecord record, OffenceSource source, String actor,
                             String action, String detail) {
        AuditEntry entry = new AuditEntry();
        entry.record = record;
        entry.occurredAt = Instant.now();
        entry.source = source;
        entry.actor = actor;
        entry.action = action;
        entry.detail = detail;
        auditEntryRepository.persist(entry);
    }

    /**
     * Map a source's offence string to the domain enum. The conduct engine names the channel-derived
     * offence (chatAbuse | voiceAbuse); an anti-cheat vendor names the cheat archetype (aimbot | ...).
     * An unknown or blank value falls back to NONE rather than failing the whole request.
     */
    private OffenceType resolveOffenceType(String offenceType) {
        if (offenceType == null || offenceType.isBlank()) {
            return OffenceType.NONE;
        }
        return OffenceType.fromValue(offenceType);
    }

    private int clampTrustScore(int trustScore) {
        return Math.max(MIN_TRUST_SCORE, Math.min(MAX_TRUST_SCORE, trustScore));
    }

    private double clampConfidence(double confidence) {
        return Math.max(0.0, Math.min(1.0, confidence));
    }

    private ResultView buildResultView(String profileId, String connectionId) {
        PlayerProfile profile = playerProfileRepository.findById(profileId);
        AccountabilityRecord record = accountabilityRecordRepository.findByConnectionId(connectionId);

        if (record != null && !record.profileId.equals(profileId)) {
            throw new NotFoundException("Connection not found");
        }

        List<CaseView> caseHistory = record == null ? List.of()
                : caseEventRepository.listByRecordId(record.recordId).stream()
                .map(event -> new CaseView(event.occurredAt, event.offenceType, event.source, event.score, event.status))
                .toList();

        List<AuditView> auditTrail = record == null ? List.of()
                : auditEntryRepository.listByRecordId(record.recordId).stream()
                .map(entry -> new AuditView(entry.occurredAt, entry.source, entry.actor, entry.action, entry.detail))
                .toList();

        GameConnection currentConnection = gameConnectionRepository.findById(connectionId);
        Instant now = Instant.now();
        List<GameConnection> linkedConnections = gameConnectionRepository.listActiveByProfile(profileId);
        int linkedGamesCount = linkedConnections.size();
        int activeBanCount = (int) linkedConnections.stream()
                .filter(c -> externalBanRepository.hasActiveBan(c.connectionId, now))
                .count();

        return new ResultView(
                connectionId,
                currentConnection == null ? null : currentConnection.gameName,
                currentConnection == null ? null : currentConnection.imageUrl,
                currentConnection == null ? null : currentConnection.provider,
                profile == null ? PlayerProfile.DEFAULT_GLOBAL_TRUST_SCORE : profile.globalTrustScore,
                linkedGamesCount,
                activeBanCount,
                record == null ? null : record.conductScore,
                record == null ? null : record.status,
                summarizeOtherGames(profileId, connectionId),
                caseHistory,
                auditTrail
        );
    }

    private List<CrossGameSignalView> summarizeOtherGames(String profileId, String connectionId) {
        Instant now = Instant.now();
        return gameConnectionRepository.listOtherConnections(profileId, connectionId).stream()
                .map(connection -> {
                    AccountabilityRecord record = accountabilityRecordRepository.findByConnectionId(connection.connectionId);
                    boolean overturned = record != null && record.status == AccountabilityStatus.OVERTURNED;
                    // An overturned sanction is revoked, so its confirmed offences no longer count.
                    int confirmed = overturned ? 0
                            : Math.toIntExact(caseEventRepository.countConfirmedByConnectionId(connection.connectionId));
                    ExternalBan activeBan = externalBanRepository.findActiveBan(connection.connectionId, now);
                    return new CrossGameSignalView(
                            connection.operatorId,
                            connection.gameId,
                            connection.gameName,
                            connection.imageUrl,
                            connection.provider,
                            record == null ? null : record.status.value(),
                            confirmed,
                            activeBan != null,
                            activeBan == null ? null : activeBan.reason,
                            activeBan == null ? null : activeBan.bannedAt,
                            activeBan == null ? null : activeBan.expiresAt);
                })
                .filter(signal -> signal.confirmedOffenceCount() > 0 || signal.hasActiveBan())
                .toList();
    }
}

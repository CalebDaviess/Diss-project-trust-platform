package com.trustplatform.accountability.service;

import com.trustplatform.accountability.domain.AccountabilityStatus;
import com.trustplatform.accountability.domain.OffenceSource;
import com.trustplatform.accountability.dto.AppealView;
import com.trustplatform.accountability.dto.AppealableSanction;
import com.trustplatform.accountability.dto.AppealsOverview;
import com.trustplatform.accountability.dto.ResolveAppealRequest;
import com.trustplatform.accountability.dto.SubmitAppealRequest;
import com.trustplatform.accountability.entity.AccountabilityRecord;
import com.trustplatform.accountability.entity.Appeal;
import com.trustplatform.accountability.entity.AuditEntry;
import com.trustplatform.accountability.entity.CaseEvent;
import com.trustplatform.accountability.entity.ExternalBan;
import com.trustplatform.accountability.entity.GameConnection;
import com.trustplatform.accountability.entity.PlayerProfile;
import com.trustplatform.accountability.repository.AccountabilityRecordRepository;
import com.trustplatform.accountability.repository.AntiCheatVerdictRepository;
import com.trustplatform.accountability.repository.AppealRepository;
import com.trustplatform.accountability.repository.AuditEntryRepository;
import com.trustplatform.accountability.repository.CaseEventRepository;
import com.trustplatform.accountability.repository.ExternalBanRepository;
import com.trustplatform.accountability.repository.GameConnectionRepository;
import com.trustplatform.accountability.repository.PlayerProfileRepository;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.transaction.Transactional;
import jakarta.ws.rs.BadRequestException;
import jakarta.ws.rs.NotFoundException;
import jakarta.ws.rs.WebApplicationException;
import jakarta.ws.rs.core.Response;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

/**
 * Appeals against confirmed sanctions. Submitting an appeal moves the game's record to
 * {@code appealed} ("under review"); resolving it (simulated governance) either upholds the
 * sanction ({@code denied} → back to {@code confirmed}) or overturns it ({@code approved} →
 * {@code overturned}, with the sanction's trust penalty reversed).
 */
@ApplicationScoped
public class AppealService {

    private static final int MIN_TRUST = 0;
    private static final int MAX_TRUST = 100;

    private final GameConnectionRepository gameConnectionRepository;
    private final AccountabilityRecordRepository accountabilityRecordRepository;
    private final CaseEventRepository caseEventRepository;
    private final AuditEntryRepository auditEntryRepository;
    private final AppealRepository appealRepository;
    private final PlayerProfileRepository playerProfileRepository;
    private final AntiCheatVerdictRepository antiCheatVerdictRepository;
    private final ExternalBanRepository externalBanRepository;
    private final TrustHistoryRecorder trustHistoryRecorder;

    public AppealService(GameConnectionRepository gameConnectionRepository,
                         AccountabilityRecordRepository accountabilityRecordRepository,
                         CaseEventRepository caseEventRepository,
                         AuditEntryRepository auditEntryRepository,
                         AppealRepository appealRepository,
                         PlayerProfileRepository playerProfileRepository,
                         AntiCheatVerdictRepository antiCheatVerdictRepository,
                         ExternalBanRepository externalBanRepository,
                         TrustHistoryRecorder trustHistoryRecorder) {
        this.gameConnectionRepository = gameConnectionRepository;
        this.accountabilityRecordRepository = accountabilityRecordRepository;
        this.caseEventRepository = caseEventRepository;
        this.auditEntryRepository = auditEntryRepository;
        this.appealRepository = appealRepository;
        this.playerProfileRepository = playerProfileRepository;
        this.antiCheatVerdictRepository = antiCheatVerdictRepository;
        this.externalBanRepository = externalBanRepository;
        this.trustHistoryRecorder = trustHistoryRecorder;
    }

    @Transactional
    public AppealsOverview overview(String profileId) {
        Instant now = Instant.now();
        List<AppealableSanction> appealable = new ArrayList<>();
        for (GameConnection connection : gameConnectionRepository.listActiveByProfile(profileId)) {
            AccountabilityRecord record = accountabilityRecordRepository.findByConnectionId(connection.connectionId);
            if (record == null || record.status != AccountabilityStatus.CONFIRMED) {
                continue;
            }
            if (appealRepository.findOpenByConnection(connection.connectionId) != null) {
                continue;
            }
            // A sanction whose appeal was already reviewed and upheld (denied) is final — not reappealable.
            if (appealRepository.findDeniedByConnection(connection.connectionId) != null) {
                continue;
            }
            // A sanction is only appealable when the operator allows it (non-appealable bans excluded).
            ExternalBan activeBan = externalBanRepository.findActiveBan(connection.connectionId, now);
            if (activeBan != null && !activeBan.appealable) {
                continue;
            }
            CaseEvent latest = caseEventRepository.findLatestByRecordId(record.recordId);
            appealable.add(new AppealableSanction(
                    connection.connectionId, connection.gameId, connection.gameName, connection.imageUrl,
                    connection.provider, connection.operatorId,
                    latest == null ? null : latest.offenceType.value(),
                    latest == null ? null : latest.source,
                    latest == null ? null : latest.score));
        }

        List<AppealView> appeals = appealRepository.listByProfile(profileId).stream()
                .map(this::toView)
                .toList();
        return new AppealsOverview(appealable, appeals);
    }

    @Transactional
    public AppealView submit(String profileId, SubmitAppealRequest request) {
        GameConnection connection = gameConnectionRepository.findOwned(profileId, request.connectionId());
        if (connection == null) {
            throw new NotFoundException("Game connection not found");
        }
        AccountabilityRecord record = accountabilityRecordRepository.findByConnectionId(request.connectionId());
        if (record == null || record.status != AccountabilityStatus.CONFIRMED) {
            throw new BadRequestException("Only a confirmed sanction can be appealed");
        }
        ExternalBan activeBan = externalBanRepository.findActiveBan(request.connectionId(), Instant.now());
        if (activeBan != null && !activeBan.appealable) {
            throw new BadRequestException("This sanction was marked non-appealable by the game operator");
        }
        if (appealRepository.findOpenByConnection(request.connectionId()) != null) {
            throw new WebApplicationException("An appeal for this game is already under review", Response.Status.CONFLICT);
        }
        if (appealRepository.findDeniedByConnection(request.connectionId()) != null) {
            throw new WebApplicationException(
                    "This sanction was already reviewed and upheld, so it cannot be appealed again",
                    Response.Status.CONFLICT);
        }

        CaseEvent latest = caseEventRepository.findLatestByRecordId(record.recordId);
        Appeal appeal = new Appeal();
        appeal.appealId = UUID.randomUUID().toString();
        appeal.connectionId = connection.connectionId;
        appeal.profileId = profileId;
        appeal.operatorId = connection.operatorId;
        appeal.gameId = connection.gameId;
        appeal.offenceType = latest == null ? null : latest.offenceType.value();
        appeal.grounds = request.grounds();
        appeal.description = request.description();
        appeal.evidenceCount = request.evidenceCount() == null ? 0 : Math.max(0, request.evidenceCount());
        appeal.status = "submitted";
        appeal.submittedAt = Instant.now();
        appealRepository.persist(appeal);

        record.status = AccountabilityStatus.APPEALED;
        appendAudit(record, OffenceSource.PLAYER, "player", "APPEAL_SUBMITTED",
                "Appeal submitted" + (request.grounds() != null ? " (" + request.grounds() + ")" : ""));

        return toView(appeal);
    }

    @Transactional
    public AppealView resolve(String profileId, String appealId, ResolveAppealRequest request) {
        Appeal appeal = appealRepository.findOwned(profileId, appealId);
        if (appeal == null) {
            throw new NotFoundException("Appeal not found");
        }
        if (!"submitted".equals(appeal.status)) {
            throw new BadRequestException("Appeal has already been resolved");
        }
        boolean approved = "approved".equals(request.decision());
        if (!approved && !"denied".equals(request.decision())) {
            throw new BadRequestException("decision must be 'approved' or 'denied'");
        }

        appeal.status = approved ? "approved" : "denied";
        appeal.resolvedAt = Instant.now();
        // The operator may leave a reason. For the demo, if the reviewer gives no note on a denial we
        // generate a representative one so the player sees why their appeal was upheld.
        appeal.decisionNote = approved
                ? note(request, "Reviewed and overturned.")
                : denialNote(request);

        AccountabilityRecord record = accountabilityRecordRepository.findByConnectionId(appeal.connectionId);
        if (record != null) {
            if (approved) {
                record.status = AccountabilityStatus.OVERTURNED;
                liftActiveBans(appeal.connectionId, appeal.resolvedAt);
                restoreTrust(record.profileId, appeal.connectionId);
                appendAudit(record, OffenceSource.OPERATOR, "operator:review", "APPEAL_APPROVED",
                        appeal.decisionNote);
            } else {
                record.status = AccountabilityStatus.CONFIRMED;
                appendAudit(record, OffenceSource.OPERATOR, "operator:review", "APPEAL_DENIED",
                        appeal.decisionNote);
            }
        }
        return toView(appeal);
    }

    /** Operator-supplied denial reason, or a representative simulated one for the demo. */
    private static final List<String> SIMULATED_DENIAL_REASONS = List.of(
            "Reviewed and upheld. The reported behaviour was confirmed against our in-game logs for this account.",
            "Reviewed and upheld. Chat and voice records at the time of the incident matched the original report.",
            "Reviewed and upheld. Our moderation team found the evidence consistent with the sanction applied.",
            "Reviewed and upheld. The account was signed in on the device and session linked to the offence.",
            "Reviewed and upheld. No new evidence in the appeal contradicted the original finding.",
            "Reviewed and upheld. The conduct breached our community guidelines and the penalty stands.");

    private static String denialNote(ResolveAppealRequest request) {
        if (request.note() != null && !request.note().isBlank()) {
            return request.note();
        }
        int i = java.util.concurrent.ThreadLocalRandom.current().nextInt(SIMULATED_DENIAL_REASONS.size());
        return SIMULATED_DENIAL_REASONS.get(i);
    }

    /** Expire any currently active external bans on an overturned connection while preserving audit rows. */
    private void liftActiveBans(String connectionId, Instant liftedAt) {
        Instant cutoff = liftedAt != null ? liftedAt : Instant.now();
        for (ExternalBan ban : externalBanRepository.listByConnectionId(connectionId)) {
            if (ban.isActiveAt(cutoff)) {
                ban.expiresAt = cutoff;
            }
        }
    }

    /** Reverse the trust penalties (anti-cheat verdicts + external bans) applied on a connection. */
    private void restoreTrust(String profileId, String connectionId) {
        PlayerProfile profile = playerProfileRepository.findById(profileId);
        if (profile == null) {
            return;
        }
        int penalty = antiCheatVerdictRepository.listByConnectionId(connectionId).stream()
                .mapToInt(v -> v.trustDelta).sum()
                + externalBanRepository.listByConnectionId(connectionId).stream()
                .mapToInt(b -> b.trustDelta).sum();
        // Penalties are negative; subtracting restores the lost trust.
        profile.globalTrustScore = Math.max(MIN_TRUST, Math.min(MAX_TRUST, profile.globalTrustScore - penalty));
        trustHistoryRecorder.record(profile.profileId, profile.globalTrustScore, "appeal-overturned");
    }

    private static String note(ResolveAppealRequest request, String fallback) {
        return request.note() != null && !request.note().isBlank() ? request.note() : fallback;
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

    private AppealView toView(Appeal appeal) {
        GameConnection connection = gameConnectionRepository.findById(appeal.connectionId);
        return new AppealView(
                appeal.appealId, appeal.connectionId, appeal.gameId,
                connection == null ? null : connection.gameName,
                connection == null ? null : connection.imageUrl,
                connection == null ? null : connection.provider,
                appeal.offenceType, appeal.grounds, appeal.description, appeal.evidenceCount,
                appeal.status, appeal.submittedAt, appeal.resolvedAt, appeal.decisionNote);
    }
}

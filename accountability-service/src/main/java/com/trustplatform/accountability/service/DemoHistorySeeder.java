package com.trustplatform.accountability.service;

import com.trustplatform.accountability.domain.AccountabilityStatus;
import com.trustplatform.accountability.domain.OffenceSource;
import com.trustplatform.accountability.domain.OffenceType;
import com.trustplatform.accountability.entity.AccountabilityRecord;
import com.trustplatform.accountability.entity.AntiCheatVerdict;
import com.trustplatform.accountability.entity.AuditEntry;
import com.trustplatform.accountability.entity.CaseEvent;
import com.trustplatform.accountability.entity.ExternalBan;
import com.trustplatform.accountability.entity.GameConnection;
import com.trustplatform.accountability.entity.PlayerProfile;
import com.trustplatform.accountability.entity.TrustHistory;
import com.trustplatform.accountability.repository.AccountabilityRecordRepository;
import com.trustplatform.accountability.repository.AntiCheatVerdictRepository;
import com.trustplatform.accountability.repository.AuditEntryRepository;
import com.trustplatform.accountability.repository.ExternalBanRepository;
import com.trustplatform.accountability.repository.GameConnectionRepository;
import com.trustplatform.accountability.repository.PlayerProfileRepository;
import com.trustplatform.accountability.repository.TrustHistoryRepository;
import io.quarkus.runtime.StartupEvent;
import jakarta.enterprise.event.Observes;
import jakarta.inject.Singleton;
import jakarta.transaction.Transactional;
import org.eclipse.microprofile.config.inject.ConfigProperty;
import org.jboss.logging.Logger;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.UUID;

/**
 * Seeds a realistic, synthetic two-game cross-game accountability history for the demo login
 * ({@code player@example.com}) so evaluators and Docker testers immediately see a populated
 * dashboard, trust trend, source-attributed audit trail, active ban, and appealable sanction.
 *
 * <p>Guarded by {@code accountability.auth.seed-demo-history} (false by default and in tests;
 * enabled in local dev and Docker demo). Strictly idempotent — if the demo profile already has
 * any connections or records, seeding is skipped so restarts never overwrite user activity.
 */
@Singleton
public class DemoHistorySeeder {

    private static final Logger LOG = Logger.getLogger(DemoHistorySeeder.class);

    public static final String DEMO_CONN_VALORANT = "gc-demo-valorant";
    public static final String DEMO_CONN_CS2 = "gc-demo-cs2";
    public static final String DEMO_VERDICT_ID = "demo-verdict-cs2-1";
    public static final String DEMO_BAN_ID = "demo-ban-cs2-1";

    private final PlayerProfileRepository playerProfileRepository;
    private final GameConnectionRepository gameConnectionRepository;
    private final AccountabilityRecordRepository accountabilityRecordRepository;
    private final AuditEntryRepository auditEntryRepository;
    private final AntiCheatVerdictRepository antiCheatVerdictRepository;
    private final ExternalBanRepository externalBanRepository;
    private final TrustHistoryRepository trustHistoryRepository;
    private final boolean seedHistoryEnabled;

    public DemoHistorySeeder(
            PlayerProfileRepository playerProfileRepository,
            GameConnectionRepository gameConnectionRepository,
            AccountabilityRecordRepository accountabilityRecordRepository,
            AuditEntryRepository auditEntryRepository,
            AntiCheatVerdictRepository antiCheatVerdictRepository,
            ExternalBanRepository externalBanRepository,
            TrustHistoryRepository trustHistoryRepository,
            @ConfigProperty(name = "accountability.auth.seed-demo-history", defaultValue = "false")
            boolean seedHistoryEnabled) {
        this.playerProfileRepository = playerProfileRepository;
        this.gameConnectionRepository = gameConnectionRepository;
        this.accountabilityRecordRepository = accountabilityRecordRepository;
        this.auditEntryRepository = auditEntryRepository;
        this.antiCheatVerdictRepository = antiCheatVerdictRepository;
        this.externalBanRepository = externalBanRepository;
        this.trustHistoryRepository = trustHistoryRepository;
        this.seedHistoryEnabled = seedHistoryEnabled;
    }

    void onStart(@Observes StartupEvent event) {
        if (!seedHistoryEnabled) {
            return;
        }
        seedDemoHistoryIfEmpty();
    }

    /**
     * Populates two synthetic linked games (VALORANT + Counter-Strike 2) with contrasting
     * detection sources (own ML conduct engine pending review vs external anti-cheat confirmed
     * + active appealable temporary ban) if the demo profile currently has no connections/records.
     *
     * @return {@code true} if demo history was seeded, {@code false} if already present.
     */
    @Transactional
    public boolean seedDemoHistoryIfEmpty() {
        String profileId = DemoUserSeeder.DEMO_PROFILE_ID;
        if (!gameConnectionRepository.listActiveByProfile(profileId).isEmpty()
                || accountabilityRecordRepository.count("profileId", profileId) > 0) {
            return false;
        }

        Instant now = Instant.now();
        Instant fourteenDaysAgo = now.minus(14, ChronoUnit.DAYS);
        Instant sixDaysAgo = now.minus(6, ChronoUnit.DAYS);
        Instant threeDaysAgo = now.minus(3, ChronoUnit.DAYS);
        Instant twoDaysAgo = now.minus(2, ChronoUnit.DAYS);
        Instant twelveDaysFromNow = now.plus(12, ChronoUnit.DAYS);

        PlayerProfile profile = playerProfileRepository.findById(profileId);
        if (profile == null) {
            profile = new PlayerProfile();
            profile.profileId = profileId;
            profile.globalTrustScore = 62;
            playerProfileRepository.persist(profile);
        } else {
            profile.globalTrustScore = 62;
        }

        // Trust-over-time series so the dashboard trend graph shows real historical drops.
        if (trustHistoryRepository.count("profileId", profileId) == 0) {
            recordTrustPoint(profileId, fourteenDaysAgo, 100, "account-created");
            recordTrustPoint(profileId, sixDaysAgo, 80, "anti-cheat");
            recordTrustPoint(profileId, twoDaysAgo, 62, "ban");
        }

        // 1) VALORANT — platform conduct engine flag (PENDING human review)
        GameConnection valorant = createConnection(
                DEMO_CONN_VALORANT, profile, "riot", "riot:valorant",
                "VALORANT", "riot", "DemoPlayer#EUW", null, fourteenDaysAgo);

        AccountabilityRecord valorantRecord = new AccountabilityRecord();
        valorantRecord.recordId = UUID.randomUUID().toString();
        valorantRecord.connection = valorant;
        valorantRecord.profileId = profileId;
        valorantRecord.operatorId = valorant.operatorId;
        valorantRecord.gameId = valorant.gameId;
        valorantRecord.conductScore = 84;
        valorantRecord.status = AccountabilityStatus.PENDING;

        CaseEvent conductCase = new CaseEvent();
        conductCase.occurredAt = threeDaysAgo;
        conductCase.offenceType = OffenceType.CHAT_ABUSE;
        conductCase.source = OffenceSource.CONDUCT_ENGINE;
        conductCase.score = 84;
        conductCase.status = AccountabilityStatus.PENDING;
        valorantRecord.addCaseEvent(conductCase);
        accountabilityRecordRepository.persist(valorantRecord);

        appendAudit(valorantRecord, threeDaysAgo, OffenceSource.CONDUCT_ENGINE, "conduct-engine",
                "FLAGGED", "chatAbuse flagged for review (score 84) — synthetic demo sample");

        // 2) Counter-Strike 2 — external anti-cheat verdict (CONFIRMED) + active appealable temp ban
        GameConnection cs2 = createConnection(
                DEMO_CONN_CS2, profile, "steam", "steam:730",
                "Counter-Strike 2", "steam", "demo_cs2_76561198000", null, fourteenDaysAgo);

        if (antiCheatVerdictRepository.findById(DEMO_VERDICT_ID) == null) {
            AntiCheatVerdict verdict = new AntiCheatVerdict();
            verdict.verdictId = DEMO_VERDICT_ID;
            verdict.profileId = profileId;
            verdict.connectionId = cs2.connectionId;
            verdict.operatorId = cs2.operatorId;
            verdict.gameId = cs2.gameId;
            verdict.offenceType = OffenceType.AIMBOT.value();
            verdict.confidence = 0.94;
            verdict.evidenceLink = "https://demo.trustplatform.invalid/verdicts/" + DEMO_VERDICT_ID;
            verdict.detectedAt = sixDaysAgo;
            verdict.trustDelta = -20;
            antiCheatVerdictRepository.persist(verdict);
        }

        if (externalBanRepository.findById(DEMO_BAN_ID) == null) {
            ExternalBan ban = new ExternalBan();
            ban.banId = DEMO_BAN_ID;
            ban.profileId = profileId;
            ban.connectionId = cs2.connectionId;
            ban.operatorId = cs2.operatorId;
            ban.gameId = cs2.gameId;
            ban.reason = "External anti-cheat confirmed aimbot violation (synthetic demo)";
            ban.bannedAt = twoDaysAgo;
            ban.expiresAt = twelveDaysFromNow;
            ban.trustDelta = -18;
            ban.banType = "temporary";
            ban.appealable = true;
            externalBanRepository.persist(ban);
        }

        AccountabilityRecord cs2Record = new AccountabilityRecord();
        cs2Record.recordId = UUID.randomUUID().toString();
        cs2Record.connection = cs2;
        cs2Record.profileId = profileId;
        cs2Record.operatorId = cs2.operatorId;
        cs2Record.gameId = cs2.gameId;
        cs2Record.conductScore = 0;
        cs2Record.status = AccountabilityStatus.CONFIRMED;

        CaseEvent cheatCase = new CaseEvent();
        cheatCase.occurredAt = sixDaysAgo;
        cheatCase.offenceType = OffenceType.AIMBOT;
        cheatCase.source = OffenceSource.ANTI_CHEAT;
        cheatCase.score = 94;
        cheatCase.evidenceLink = "https://demo.trustplatform.invalid/verdicts/" + DEMO_VERDICT_ID;
        cheatCase.status = AccountabilityStatus.CONFIRMED;
        cs2Record.addCaseEvent(cheatCase);
        accountabilityRecordRepository.persist(cs2Record);

        appendAudit(cs2Record, sixDaysAgo, OffenceSource.ANTI_CHEAT, "anti-cheat:steam",
                "VERDICT_CONFIRMED", "aimbot (vendor confidence 0.94)");
        appendAudit(cs2Record, twoDaysAgo, OffenceSource.OPERATOR, "operator:steam",
                "BAN", "External anti-cheat confirmed aimbot violation (synthetic demo)");

        LOG.infof("Seeded synthetic two-game demo history for '%s' (VALORANT + Counter-Strike 2)",
                DemoUserSeeder.DEMO_USERNAME);
        return true;
    }

    private GameConnection createConnection(
            String connectionId,
            PlayerProfile profile,
            String operatorId,
            String gameId,
            String gameName,
            String provider,
            String operatorAccountRef,
            String imageUrl,
            Instant linkedAt) {
        GameConnection existing = gameConnectionRepository.findById(connectionId);
        if (existing != null) {
            return existing;
        }
        GameConnection conn = new GameConnection();
        conn.connectionId = connectionId;
        conn.profile = profile;
        conn.operatorId = operatorId;
        conn.gameId = gameId;
        conn.gameName = gameName;
        conn.provider = provider;
        conn.operatorAccountRef = operatorAccountRef;
        conn.imageUrl = imageUrl;
        conn.status = "active";
        conn.linkedAt = linkedAt;
        gameConnectionRepository.persist(conn);
        return conn;
    }

    private void recordTrustPoint(String profileId, Instant occurredAt, int score, String reason) {
        TrustHistory point = new TrustHistory();
        point.id = UUID.randomUUID().toString();
        point.profileId = profileId;
        point.occurredAt = occurredAt;
        point.score = score;
        point.reason = reason;
        trustHistoryRepository.persist(point);
    }

    private void appendAudit(AccountabilityRecord record, Instant occurredAt, OffenceSource source,
                             String actor, String action, String detail) {
        AuditEntry entry = new AuditEntry();
        entry.record = record;
        entry.occurredAt = occurredAt;
        entry.source = source;
        entry.actor = actor;
        entry.action = action;
        entry.detail = detail;
        auditEntryRepository.persist(entry);
    }
}

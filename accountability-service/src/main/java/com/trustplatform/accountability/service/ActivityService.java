package com.trustplatform.accountability.service;

import com.trustplatform.accountability.dto.ActivityItem;
import com.trustplatform.accountability.entity.AccountabilityRecord;
import com.trustplatform.accountability.entity.GameConnection;
import com.trustplatform.accountability.repository.AccountabilityRecordRepository;
import com.trustplatform.accountability.repository.AuditEntryRepository;
import com.trustplatform.accountability.repository.GameConnectionRepository;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.transaction.Transactional;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;

/**
 * Builds the player's cross-game activity feed by merging the audit trail of every linked game,
 * annotated with that game's name/logo. Powers the My Record tab without N client round-trips.
 */
@ApplicationScoped
public class ActivityService {

    private final GameConnectionRepository gameConnectionRepository;
    private final AccountabilityRecordRepository accountabilityRecordRepository;
    private final AuditEntryRepository auditEntryRepository;

    public ActivityService(GameConnectionRepository gameConnectionRepository,
                           AccountabilityRecordRepository accountabilityRecordRepository,
                           AuditEntryRepository auditEntryRepository) {
        this.gameConnectionRepository = gameConnectionRepository;
        this.accountabilityRecordRepository = accountabilityRecordRepository;
        this.auditEntryRepository = auditEntryRepository;
    }

    /**
     * Activity across all of the player's games, newest first. When {@code connectionId} is given,
     * only that game's activity is returned (and only if it belongs to the player).
     */
    @Transactional
    public List<ActivityItem> feed(String profileId, String connectionId) {
        List<GameConnection> connections = gameConnectionRepository.listActiveByProfile(profileId).stream()
                .filter(c -> connectionId == null || connectionId.isBlank() || connectionId.equals(c.connectionId))
                .toList();

        List<ActivityItem> items = new ArrayList<>();
        for (GameConnection connection : connections) {
            AccountabilityRecord record = accountabilityRecordRepository.findByConnectionId(connection.connectionId);
            if (record == null) {
                continue;
            }
            auditEntryRepository.listByRecordId(record.recordId).forEach(entry -> items.add(new ActivityItem(
                    connection.connectionId,
                    connection.gameId,
                    connection.gameName,
                    connection.imageUrl,
                    connection.provider,
                    entry.occurredAt,
                    entry.source,
                    entry.action,
                    entry.actor,
                    entry.detail)));
        }
        items.sort(Comparator.comparing(ActivityItem::occurredAt).reversed());
        return items;
    }
}

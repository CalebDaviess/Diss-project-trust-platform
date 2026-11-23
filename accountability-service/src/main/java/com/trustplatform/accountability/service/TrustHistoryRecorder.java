package com.trustplatform.accountability.service;

import com.trustplatform.accountability.entity.TrustHistory;
import com.trustplatform.accountability.repository.TrustHistoryRepository;
import jakarta.enterprise.context.ApplicationScoped;

import java.time.Instant;
import java.util.UUID;

/** Appends a point to a player's trust-over-time series whenever their global trust score changes. */
@ApplicationScoped
public class TrustHistoryRecorder {

    private final TrustHistoryRepository trustHistoryRepository;

    public TrustHistoryRecorder(TrustHistoryRepository trustHistoryRepository) {
        this.trustHistoryRepository = trustHistoryRepository;
    }

    /** Record the new score. Must be called within an existing transaction. */
    public void record(String profileId, int newScore, String reason) {
        TrustHistory point = new TrustHistory();
        point.id = UUID.randomUUID().toString();
        point.profileId = profileId;
        point.occurredAt = Instant.now();
        point.score = newScore;
        point.reason = reason;
        trustHistoryRepository.persist(point);
    }
}

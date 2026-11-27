package com.trustplatform.accountability.service;

import com.trustplatform.accountability.dto.TrustPointView;
import com.trustplatform.accountability.entity.PlayerProfile;
import com.trustplatform.accountability.repository.PlayerProfileRepository;
import com.trustplatform.accountability.repository.TrustHistoryRepository;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.transaction.Transactional;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

/**
 * Builds the player's trust-over-time series: it starts at account creation (score 100), moves with
 * each recorded change (ban, anti-cheat verdict, appeal overturn), and extends to "now" at the
 * current score. Range filtering (1y / 5y / lifetime) is done client-side on this full series.
 */
@ApplicationScoped
public class TrustHistoryService {

    private final PlayerProfileRepository playerProfileRepository;
    private final TrustHistoryRepository trustHistoryRepository;

    public TrustHistoryService(PlayerProfileRepository playerProfileRepository,
                               TrustHistoryRepository trustHistoryRepository) {
        this.playerProfileRepository = playerProfileRepository;
        this.trustHistoryRepository = trustHistoryRepository;
    }

    @Transactional
    public List<TrustPointView> series(String profileId) {
        Instant now = Instant.now();
        PlayerProfile profile = playerProfileRepository.findById(profileId);
        List<TrustPointView> series = new ArrayList<>();
        if (profile == null) {
            // Brand-new account with no profile yet: a flat line at the default score.
            series.add(new TrustPointView(now, PlayerProfile.DEFAULT_GLOBAL_TRUST_SCORE, "account_created"));
            return series;
        }

        List<com.trustplatform.accountability.entity.TrustHistory> stored =
                trustHistoryRepository.listByProfile(profileId);
        boolean hasCreatedAnchor = stored.stream().anyMatch(p -> "account_created".equals(p.reason));

        if (!hasCreatedAnchor) {
            Instant createdAt = profile.createdAt != null ? profile.createdAt : now;
            // Anchor: account creation at the default (100).
            series.add(new TrustPointView(createdAt, PlayerProfile.DEFAULT_GLOBAL_TRUST_SCORE, "account_created"));
        }
        // Each recorded change.
        stored.forEach(point ->
                series.add(new TrustPointView(point.occurredAt, point.score, point.reason)));
        // Extend to "now" at the current score so the line reaches today.
        series.add(new TrustPointView(now, profile.globalTrustScore, "current"));
        return series;
    }
}

package com.trustplatform.accountability.dto;

import com.trustplatform.accountability.domain.OffenceSource;

import java.time.Instant;

/**
 * One entry in the player's cross-game activity feed: an audited event (report, anti-cheat verdict,
 * ban, appeal, appeal outcome) annotated with the game it happened on.
 */
public record ActivityItem(
        String connectionId,
        String gameId,
        String gameName,
        String imageUrl,
        String provider,
        Instant occurredAt,
        OffenceSource source,
        String action,
        String actor,
        String detail
) {
}

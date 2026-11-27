package com.trustplatform.accountability.dto;

import java.time.Instant;

/**
 * An active ban on one of the player's games, with the operator-set type, duration,
 * appealability, current appeal lifecycle state ({@code none}, {@code open}, {@code denied}),
 * and the game's display metadata.
 */
public record BanView(
        String connectionId,
        String gameId,
        String gameName,
        String imageUrl,
        String provider,
        String operatorId,
        String banType,
        String reason,
        Instant bannedAt,
        Instant expiresAt,
        boolean appealable,
        String appealStatus
) {
}

package com.trustplatform.accountability.dto;

import java.time.Instant;

/**
 * An active ban on one of the player's games, with the operator-set type, duration and
 * appealability, plus the game's name/logo/launcher for display.
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
        boolean appealable
) {
}

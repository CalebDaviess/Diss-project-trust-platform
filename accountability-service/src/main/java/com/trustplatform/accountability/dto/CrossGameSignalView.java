package com.trustplatform.accountability.dto;

import java.time.Instant;

/**
 * A signal about this identity from another game/operator, enriched with the game's name/logo for
 * display. {@code confirmedOffenceCount} excludes offences that were overturned on appeal (those
 * are revoked); {@code recordStatus} is the other game's current record status. Ban detail
 * ({@code banReason}, {@code bannedAt}, {@code banExpiresAt}) is present only for an active ban.
 */
public record CrossGameSignalView(
        String operatorId,
        String gameId,
        String gameName,
        String imageUrl,
        String provider,
        String recordStatus,
        int confirmedOffenceCount,
        boolean hasActiveBan,
        String banReason,
        Instant bannedAt,
        Instant banExpiresAt
) {
}

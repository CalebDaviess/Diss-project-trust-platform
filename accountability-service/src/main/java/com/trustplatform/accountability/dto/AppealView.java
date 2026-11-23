package com.trustplatform.accountability.dto;

import java.time.Instant;

/** A submitted appeal and its review status, as shown in the Appeals tab. */
public record AppealView(
        String appealId,
        String connectionId,
        String gameId,
        String gameName,
        String imageUrl,
        String provider,
        String offenceType,
        String grounds,
        String description,
        int evidenceCount,
        String status,
        Instant submittedAt,
        Instant resolvedAt,
        String decisionNote
) {
}

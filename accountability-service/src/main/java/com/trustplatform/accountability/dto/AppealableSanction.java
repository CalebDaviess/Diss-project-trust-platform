package com.trustplatform.accountability.dto;

import com.trustplatform.accountability.domain.OffenceSource;

/** A confirmed sanction the player can appeal (one per game connection). */
public record AppealableSanction(
        String connectionId,
        String gameId,
        String gameName,
        String imageUrl,
        String provider,
        String operatorId,
        String offenceType,
        OffenceSource source,
        Integer score
) {
}

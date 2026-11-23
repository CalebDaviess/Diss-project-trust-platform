package com.trustplatform.accountability.dto;

import java.time.Instant;

/** A player's linked game connection, as shown in the portal's Games tab. */
public record ConnectionView(
        String connectionId,
        String gameId,
        String gameName,
        String operatorId,
        String provider,
        String operatorAccountRef,
        String imageUrl,
        String status,
        Instant linkedAt
) {
}

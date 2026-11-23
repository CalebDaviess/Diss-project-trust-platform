package com.trustplatform.accountability.dto;

import java.time.Instant;

/** One point in the trust-over-time series: the global trust score at a moment in time. */
public record TrustPointView(
        Instant occurredAt,
        int score,
        String reason
) {
}

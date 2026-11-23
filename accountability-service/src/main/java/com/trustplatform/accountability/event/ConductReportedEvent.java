package com.trustplatform.accountability.event;

import java.time.Instant;

public record ConductReportedEvent(
        String type,
        String profileId,
        String connectionId,
        String recordId,
        int score,
        Instant occurredAt
) {

    public static final String TYPE = "com.trustplatform.conduct.reported";

    public ConductReportedEvent(String profileId, String connectionId, String recordId, int score, Instant occurredAt) {
        this(TYPE, profileId, connectionId, recordId, score, occurredAt);
    }
}


package com.trustplatform.accountability.event;

import java.time.Instant;

/**
 * Payload (the CloudEvent {@code data}) of a conduct-report event.
 *
 * <p>Carries a hashed identity token, the game connection/record it relates to, the offence
 * type + conduct score, and a secure evidence link — never raw identity or raw evidence.
 * The CloudEvent envelope adds {@code id}/{@code type}/{@code source}/{@code subject}.
 */
public record ConductReportData(
        String profileId,
        String connectionId,
        String recordId,
        String offenceType,
        int score,
        String evidenceLink,
        Instant timestamp
) {
}


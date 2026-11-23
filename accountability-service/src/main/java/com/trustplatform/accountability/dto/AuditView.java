package com.trustplatform.accountability.dto;

import com.trustplatform.accountability.domain.OffenceSource;

import java.time.Instant;

/**
 * One entry in a record's audit trail — a human-readable, source-attributed log line describing
 * a state change (conduct flagged, anti-cheat verdict confirmed, operator ban, appeal, ...).
 */
public record AuditView(
        Instant occurredAt,
        OffenceSource source,
        String actor,
        String action,
        String detail
) {
}


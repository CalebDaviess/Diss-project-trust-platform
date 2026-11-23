package com.trustplatform.accountability.dto;

public record AntiCheatVerdictResponse(
        String status,          // "ingested" | "duplicate"
        String verdictId,
        String profileId,
        String recordId,
        int globalTrustScore
) {
}


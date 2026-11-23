package com.trustplatform.accountability.dto;

public record BanNotificationResponse(
        String status,
        String banId,
        String profileId,
        int globalTrustScore,
        boolean crossGameSignalsUpdated
) {
}


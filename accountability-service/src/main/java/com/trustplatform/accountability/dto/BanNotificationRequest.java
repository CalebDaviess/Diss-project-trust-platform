package com.trustplatform.accountability.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.time.Instant;

public record BanNotificationRequest(
        @NotBlank String banId,
        @NotBlank String profileId,
        @NotBlank String connectionId,
        @NotBlank String operatorId,
        @NotBlank String gameId,
        @Size(max = 255) String reason,
        @NotNull Instant bannedAt,
        Instant expiresAt,
        int trustDelta,
        /** Ban category: communication | temporary | permanent. Set by the operator. */
        String banType,
        /** Whether the operator allows the ban to be appealed. The platform never decides this. */
        Boolean appealable
) {
}


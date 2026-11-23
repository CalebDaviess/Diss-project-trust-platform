package com.trustplatform.accountability.dto;

import jakarta.validation.constraints.NotNull;

public record ScoreResponse(
        @NotNull Integer toxicityScore,
        @NotNull Double confidence,
        @NotNull Boolean flagged,
        @NotNull String offenceType,
        @NotNull Double threshold,
        @NotNull String modelVersion
) {
}

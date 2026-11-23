package com.trustplatform.accountability.dto;

import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.time.Instant;

/**
 * A verdict from an external third-party anti-cheat vendor (Contract: Anti-Cheat-Integration.md).
 *
 * <p>Cheating is detected OUTSIDE the platform; the vendor pushes a verdict here. The platform
 * ingests it as an auto-confirmed, appealable, fully-audited accountability signal
 * ({@code source = ANTI_CHEAT}). {@code offenceType} is a cheat archetype (e.g. "aimbot"),
 * {@code confidence} is the vendor's 0–1 confidence, and only a hashed {@code profileId} and a
 * secure {@code evidenceLink} cross the boundary — never raw evidence.
 */
public record AntiCheatVerdictRequest(
        @NotBlank String verdictId,
        @NotBlank String profileId,
        @NotBlank String connectionId,
        @NotBlank String operatorId,
        @NotBlank String gameId,
        @NotBlank String offenceType,
        @NotNull @DecimalMin("0.0") @DecimalMax("1.0") Double confidence,
        @Size(max = 512) String evidenceLink,
        @NotNull Instant detectedAt,
        int trustDelta
) {
}


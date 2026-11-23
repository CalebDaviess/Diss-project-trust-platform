package com.trustplatform.accountability.dto;

import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;

/**
 * The six conduct features (see dissertation-vault/03-methodology/Features.md) plus the
 * {@code channel} they were observed on. Features are computed at source (in the game client /
 * operator), never raw chat text — only derived, privacy-preserving signals cross the boundary.
 *
 * <p>{@code channel} ("text" | "voice") is metadata: it names the offence when flagged
 * (text → chatAbuse, voice → voiceAbuse); it is NOT a model input.
 */
public record ConductFeatureVector(
        @NotNull @Pattern(regexp = "text|voice") String channel,
        @NotNull @DecimalMin("0.0") @DecimalMax("1.0") Double toxicityLexiconScore,
        @NotNull @DecimalMin("0.0") @DecimalMax("1.0") Double severityWeighted,
        @NotNull @DecimalMin("0.0") @DecimalMax("1.0") Double targetedHarassment,
        @NotNull @DecimalMin("0.0") @DecimalMax("1.0") Double capsRatio,
        @NotNull @DecimalMin("0.0") @DecimalMax("1.0") Double repetitionRate,
        @NotNull @DecimalMin("0.0") @DecimalMax("1.0") Double messageBurstRate
) {
}


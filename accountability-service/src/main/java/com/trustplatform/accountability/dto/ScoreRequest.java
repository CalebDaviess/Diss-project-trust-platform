package com.trustplatform.accountability.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record ScoreRequest(
        @JsonProperty("profileId") @NotBlank String profileId,
        @NotNull @Valid ConductFeatureVector features
) {
}

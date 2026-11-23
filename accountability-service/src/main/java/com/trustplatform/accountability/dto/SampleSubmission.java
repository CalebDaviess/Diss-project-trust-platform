package com.trustplatform.accountability.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record SampleSubmission(
        @NotBlank String gameConnectionId,
        @NotBlank String operatorId,
        @NotBlank String gameId,
        @NotNull @Valid ConductFeatureVector features,
        @Size(max = 512) String evidenceLink
) {
}

package com.trustplatform.accountability.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/**
 * A player's appeal submission. The offence being appealed is identified by the game
 * {@code connectionId}; the platform derives the sanction from that connection's record.
 */
public record SubmitAppealRequest(
        @NotBlank String connectionId,
        String grounds,
        @NotBlank @Size(max = 2000) String description,
        Integer evidenceCount
) {
}

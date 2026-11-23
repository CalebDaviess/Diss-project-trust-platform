package com.trustplatform.accountability.dto;

import jakarta.validation.constraints.NotBlank;

/** Dev/test demo: simulate a typed operator ban on the player's own connection. */
public record SimulateBanRequest(
        @NotBlank String connectionId,
        /** communication | temporary | permanent. */
        String banType,
        /** Duration in days; null/omitted means no expiry (used for permanent). */
        Integer durationDays,
        /** Whether the (simulated) operator allows an appeal. */
        Boolean appealable
) {
}

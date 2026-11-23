package com.trustplatform.accountability.dto;

import jakarta.validation.constraints.Pattern;

/** Simulated review decision for an appeal (governance in production). */
public record ResolveAppealRequest(
        @Pattern(regexp = "approved|denied") String decision,
        String note
) {
}

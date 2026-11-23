package com.trustplatform.accountability.dto;

import jakarta.validation.constraints.NotBlank;

/** Login request for POST /auth (Contract 0). The raw password is verified then discarded. */
public record AuthRequest(
        @NotBlank String username,
        @NotBlank String password
) {
}


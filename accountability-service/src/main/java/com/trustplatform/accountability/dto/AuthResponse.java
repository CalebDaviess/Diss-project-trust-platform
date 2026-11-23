package com.trustplatform.accountability.dto;

/**
 * Login response for POST /auth (Contract 0). Returns a stateless JWT whose {@code sub}
 * is the hashed profile id; all later calls send {@code Authorization: Bearer <token>}.
 */
public record AuthResponse(
        String token,
        String tokenType,
        long expiresIn
) {
}


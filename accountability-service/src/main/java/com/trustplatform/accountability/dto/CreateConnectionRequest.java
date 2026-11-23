package com.trustplatform.accountability.dto;

import jakarta.validation.constraints.NotBlank;

/**
 * Request to link a game to the signed-in player's identity (POST /connections).
 *
 * <p>In production the {@code provider} + {@code operatorAccountRef} come from a verified publisher
 * OAuth flow (Steam/Battle.net/Riot/…); in the prototype they are supplied by the mocked connect
 * flow. {@code gameId} is the catalogue id (e.g. a Steam appid).
 */
public record CreateConnectionRequest(
        @NotBlank String gameId,
        @NotBlank String gameName,
        @NotBlank String provider,
        String operatorId,
        String operatorAccountRef,
        String imageUrl,
        Boolean mature
) {

    /** Back-compat constructor for links made without an explicit maturity flag (non-mature). */
    public CreateConnectionRequest(String gameId, String gameName, String provider,
                                   String operatorId, String operatorAccountRef, String imageUrl) {
        this(gameId, gameName, provider, operatorId, operatorAccountRef, imageUrl, null);
    }

    /** True when the title is rated 18+ / mature (gated for guardian-controlled minor accounts). */
    public boolean isMature() {
        return Boolean.TRUE.equals(mature);
    }
}

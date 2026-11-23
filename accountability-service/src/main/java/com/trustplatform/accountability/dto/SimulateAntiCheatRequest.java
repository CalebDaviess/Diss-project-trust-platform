package com.trustplatform.accountability.dto;

/**
 * Portal demo request to trigger the in-module simulated anti-cheat vendor against the caller's own
 * connection. All fields are optional — the service falls back to the demo defaults
 * ({@code gc-1}/{@code op-1}/{@code game-a}). Dev/test only
 * (see {@code AccountabilityResource#simulateAntiCheatVerdict}).
 */
public record SimulateAntiCheatRequest(String connectionId, String operatorId, String gameId) {
}


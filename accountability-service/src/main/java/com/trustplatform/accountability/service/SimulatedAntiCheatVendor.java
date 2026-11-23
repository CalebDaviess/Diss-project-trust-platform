package com.trustplatform.accountability.service;

import com.trustplatform.accountability.dto.AntiCheatVerdictRequest;
import jakarta.enterprise.context.ApplicationScoped;

import java.time.Instant;
import java.util.UUID;
import java.util.concurrent.ThreadLocalRandom;

/**
 * In-module stand-in for a third-party anti-cheat vendor (Anti-Cheat-Integration.md).
 *
 * <p>Mirrors the existing simulated operator: it lets the end-to-end pipeline run without a real
 * vendor. It only <em>authors</em> a plausible verdict (a cheat archetype, the vendor's confidence
 * and a proportionate trust penalty) — the platform still ingests it through the normal
 * {@code ingestAntiCheatVerdict} path, so the deliberate detection-source asymmetry
 * (external → confirmed) and the full audit trail are exercised for real.
 *
 * <p>Dev/test only: the demo endpoint that calls it is gated by
 * {@code accountability.demo.allow-simulated-anti-cheat}, so this is never reached in production.
 */
@ApplicationScoped
public class SimulatedAntiCheatVendor {

    /** Cheat archetypes a kernel/behavioural anti-cheat might flag (see OffenceType). */
    private static final String[] CHEAT_ARCHETYPES = {"aimbot", "triggerbot", "wallhack", "scripting"};

    public AntiCheatVerdictRequest issueVerdict(String profileId, String connectionId,
                                                String operatorId, String gameId) {
        ThreadLocalRandom random = ThreadLocalRandom.current();
        String offenceType = CHEAT_ARCHETYPES[random.nextInt(CHEAT_ARCHETYPES.length)];
        // High-confidence verdict (0.90–0.99) with a proportionate trust penalty (-25 to -40).
        double confidence = Math.round((0.90 + random.nextDouble(0.09)) * 100.0) / 100.0;
        int trustDelta = -25 - random.nextInt(16);
        return new AntiCheatVerdictRequest(
                "sim-ac-" + UUID.randomUUID(),
                profileId,
                connectionId,
                operatorId,
                gameId,
                offenceType,
                confidence,
                "https://evidence.example/anti-cheat/" + offenceType,
                Instant.now(),
                trustDelta);
    }
}


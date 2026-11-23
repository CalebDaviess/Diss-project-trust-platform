package com.trustplatform.accountability.domain;

import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonValue;

import java.util.Arrays;

/**
 * Where an accountability signal (case event / audit entry) originated.
 *
 * <ul>
 *   <li>{@code CONDUCT_ENGINE} — the platform's own ML conduct detector (toxic chat/voice).</li>
 *   <li>{@code ANTI_CHEAT} — an external third-party anti-cheat vendor verdict (cheating).</li>
 *   <li>{@code OPERATOR} — a game operator action (e.g. a ban notification).</li>
 * </ul>
 *
 * This is what makes every record auditable: each signal carries the authority that produced it.
 */
public enum OffenceSource {
    CONDUCT_ENGINE("conductEngine"),
    ANTI_CHEAT("antiCheat"),
    OPERATOR("operator"),
    PLAYER("player");

    private final String value;

    OffenceSource(String value) {
        this.value = value;
    }

    @JsonValue
    public String value() {
        return value;
    }

    @JsonCreator
    public static OffenceSource fromValue(String value) {
        return Arrays.stream(values())
                .filter(source -> source.value.equalsIgnoreCase(value))
                .findFirst()
                .orElseThrow(() -> new IllegalArgumentException("Unknown offence source: " + value));
    }
}


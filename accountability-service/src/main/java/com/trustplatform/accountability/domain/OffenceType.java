package com.trustplatform.accountability.domain;

import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonValue;

import java.util.Arrays;

public enum OffenceType {
    AIMBOT("aimbot"),
    TRIGGERBOT("triggerbot"),
    WALLHACK("wallhack"),
    SCRIPTING("scripting"),
    TIMING("timing"),
    REACTION("reaction"),
    NONE("none"),
    CHAT_ABUSE("chatAbuse"),
    VOICE_ABUSE("voiceAbuse"),
    MISCONDUCT("misconduct");

    private final String value;

    OffenceType(String value) {
        this.value = value;
    }

    @JsonValue
    public String value() {
        return value;
    }

    @JsonCreator
    public static OffenceType fromValue(String value) {
        return Arrays.stream(values())
                .filter(type -> type.value.equalsIgnoreCase(value))
                .findFirst()
                .orElseThrow(() -> new IllegalArgumentException("Unknown offence type: " + value));
    }
}


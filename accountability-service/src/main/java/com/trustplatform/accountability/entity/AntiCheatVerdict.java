package com.trustplatform.accountability.entity;

import io.quarkus.hibernate.orm.panache.PanacheEntityBase;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.time.Instant;

/**
 * A persisted third-party anti-cheat verdict, kept for idempotency and audit (mirrors
 * {@link ExternalBan}). Re-delivering the same {@code verdictId} is a no-op.
 */
@Entity
@Table(name = "anti_cheat_verdict")
public class AntiCheatVerdict extends PanacheEntityBase {

    @Id
    @Column(name = "verdict_id", nullable = false, length = 128)
    public String verdictId;

    @Column(name = "profile_id", nullable = false, length = 128)
    public String profileId;

    @Column(name = "connection_id", nullable = false, length = 128)
    public String connectionId;

    @Column(name = "operator_id", nullable = false, length = 128)
    public String operatorId;

    @Column(name = "game_id", nullable = false, length = 128)
    public String gameId;

    @Column(name = "offence_type", nullable = false, length = 32)
    public String offenceType;

    @Column(name = "confidence", nullable = false)
    public double confidence;

    @Column(name = "evidence_link", length = 512)
    public String evidenceLink;

    @Column(name = "detected_at", nullable = false)
    public Instant detectedAt;

    @Column(name = "trust_delta", nullable = false)
    public int trustDelta;
}


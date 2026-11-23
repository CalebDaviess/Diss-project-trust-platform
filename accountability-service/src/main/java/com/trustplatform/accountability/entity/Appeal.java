package com.trustplatform.accountability.entity;

import io.quarkus.hibernate.orm.panache.PanacheEntityBase;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.time.Instant;

/**
 * A player's appeal against a confirmed sanction on one game connection. The appeal is a case in
 * its own right: it records the player's grounds + description (+ mock evidence count), and its
 * {@code status} tracks the review outcome (submitted → approved | denied).
 */
@Entity
@Table(name = "appeal")
public class Appeal extends PanacheEntityBase {

    @Id
    @Column(name = "appeal_id", nullable = false, length = 36)
    public String appealId;

    @Column(name = "connection_id", nullable = false, length = 128)
    public String connectionId;

    @Column(name = "profile_id", nullable = false, length = 128)
    public String profileId;

    @Column(name = "operator_id", nullable = false, length = 128)
    public String operatorId;

    @Column(name = "game_id", nullable = false, length = 128)
    public String gameId;

    @Column(name = "offence_type", length = 64)
    public String offenceType;

    @Column(name = "grounds", length = 64)
    public String grounds;

    @Column(name = "description", nullable = false, length = 2000)
    public String description;

    @Column(name = "evidence_count", nullable = false)
    public int evidenceCount;

    /** submitted | approved | denied. */
    @Column(name = "status", nullable = false, length = 32)
    public String status = "submitted";

    @Column(name = "submitted_at", nullable = false)
    public Instant submittedAt;

    @Column(name = "resolved_at")
    public Instant resolvedAt;

    @Column(name = "decision_note", length = 2000)
    public String decisionNote;
}

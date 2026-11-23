package com.trustplatform.accountability.entity;

import io.quarkus.hibernate.orm.panache.PanacheEntityBase;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.time.Instant;

/** One point in a player's trust-over-time series: the global trust score after a change event. */
@Entity
@Table(name = "trust_history")
public class TrustHistory extends PanacheEntityBase {

    @Id
    @Column(name = "id", nullable = false, length = 36)
    public String id;

    @Column(name = "profile_id", nullable = false, length = 128)
    public String profileId;

    @Column(name = "occurred_at", nullable = false)
    public Instant occurredAt;

    @Column(name = "score", nullable = false)
    public int score;

    @Column(name = "reason", length = 64)
    public String reason;
}

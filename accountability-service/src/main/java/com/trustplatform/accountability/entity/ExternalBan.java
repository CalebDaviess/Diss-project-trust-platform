package com.trustplatform.accountability.entity;

import io.quarkus.hibernate.orm.panache.PanacheEntityBase;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.time.Instant;

@Entity
@Table(name = "external_ban")
public class ExternalBan extends PanacheEntityBase {

    @Id
    @Column(name = "ban_id", nullable = false, length = 128)
    public String banId;

    @Column(name = "profile_id", nullable = false, length = 128)
    public String profileId;

    @Column(name = "connection_id", nullable = false, length = 128)
    public String connectionId;

    @Column(name = "operator_id", nullable = false, length = 128)
    public String operatorId;

    @Column(name = "game_id", nullable = false, length = 128)
    public String gameId;

    @Column(name = "reason", length = 255)
    public String reason;

    @Column(name = "banned_at", nullable = false)
    public Instant bannedAt;

    @Column(name = "expires_at")
    public Instant expiresAt;

    @Column(name = "trust_delta", nullable = false)
    public int trustDelta;

    /** Ban category set by the operator: communication | temporary | permanent. */
    @Column(name = "ban_type", nullable = false, length = 32)
    public String banType = "temporary";

    /** Whether the operator marked this ban as appealable. The platform never decides this itself. */
    @Column(name = "appealable", nullable = false)
    public boolean appealable = true;

    public boolean isActiveAt(Instant now) {
        return !bannedAt.isAfter(now) && (expiresAt == null || expiresAt.isAfter(now));
    }
}

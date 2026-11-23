package com.trustplatform.accountability.entity;

import io.quarkus.hibernate.orm.panache.PanacheEntityBase;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;

import java.time.Instant;

@Entity
@Table(name = "game_connection")
public class GameConnection extends PanacheEntityBase {

    @Id
    @Column(name = "connection_id", nullable = false, length = 128)
    public String connectionId;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "profile_id", nullable = false)
    public PlayerProfile profile;

    @Column(name = "operator_id", nullable = false, length = 128)
    public String operatorId;

    @Column(name = "game_id", nullable = false, length = 128)
    public String gameId;

    /** Human-readable game name shown in the portal (e.g. "Overwatch 2"). */
    @Column(name = "game_name", length = 255)
    public String gameName;

    /** Identity provider used to link the account (e.g. "steam", "battlenet", "riot"). */
    @Column(name = "provider", length = 64)
    public String provider;

    /** The player's account reference at the operator (e.g. SteamID / BattleTag). */
    @Column(name = "operator_account_ref", length = 255)
    public String operatorAccountRef;

    /** Logo/capsule image URL for the game, shown in the portal. */
    @Column(name = "image_url", length = 1024)
    public String imageUrl;

    /** Connection lifecycle status (active / suspended / removed). */
    @Column(name = "status", nullable = false, length = 32)
    public String status = "active";

    /** When the player linked this game. */
    @Column(name = "linked_at")
    public Instant linkedAt;
}

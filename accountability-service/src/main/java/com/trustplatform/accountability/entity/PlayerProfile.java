package com.trustplatform.accountability.entity;

import io.quarkus.hibernate.orm.panache.PanacheEntityBase;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.time.Instant;

@Entity
@Table(name = "player_profile")
public class PlayerProfile extends PanacheEntityBase {

    public static final int DEFAULT_GLOBAL_TRUST_SCORE = 100;

    /** A normal, self-managed adult account. */
    public static final String ACCOUNT_ADULT = "ADULT";
    /** An under-18 account vouched for and controlled by a verified adult guardian. */
    public static final String ACCOUNT_GUARDIAN_MINOR = "GUARDIAN_MINOR";

    @Id
    @Column(name = "profile_id", nullable = false, length = 128)
    public String profileId;

    @Column(name = "global_trust_score", nullable = false)
    public int globalTrustScore = DEFAULT_GLOBAL_TRUST_SCORE;

    /** Account creation time — the start of the trust-over-time graph. DB-defaulted on insert. */
    @Column(name = "created_at", insertable = false, updatable = false)
    public Instant createdAt;

    /** {@link #ACCOUNT_ADULT} or {@link #ACCOUNT_GUARDIAN_MINOR}. DB-defaults to adult. */
    @Column(name = "account_type", nullable = false, length = 24)
    public String accountType = ACCOUNT_ADULT;

    /** Display name of the account holder (the child, for a guardian-controlled account). */
    @Column(name = "holder_name", length = 120)
    public String holderName;

    /** Verified guardian's name (guardian-controlled accounts only). */
    @Column(name = "guardian_name", length = 120)
    public String guardianName;

    /** Guardian's email — also the account's login (guardian-controlled accounts only). */
    @Column(name = "guardian_email", length = 255)
    public String guardianEmail;

    /** Whether this account may reach 18+ rated games. Adults: true; minors: guardian's choice. */
    @Column(name = "mature_access_allowed", nullable = false)
    public boolean matureAccessAllowed = true;

    /** True when this is an under-18, guardian-controlled account. */
    public boolean isGuardianMinor() {
        return ACCOUNT_GUARDIAN_MINOR.equals(accountType);
    }
}

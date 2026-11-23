package com.trustplatform.accountability.entity;

import com.trustplatform.accountability.domain.OffenceSource;
import io.quarkus.hibernate.orm.panache.PanacheEntityBase;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;

import java.time.Instant;

/**
 * An immutable, source-attributed audit-trail entry attached to an {@link AccountabilityRecord}.
 *
 * <p>Every state change (conduct flagged, anti-cheat verdict confirmed, operator ban, appeal)
 * appends one of these, so a record can always answer "who did what, when, and why" — the
 * accountability guarantee at the heart of the platform.
 */
@Entity
@Table(name = "audit_entry")
public class AuditEntry extends PanacheEntityBase {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "entry_id")
    public Long entryId;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "record_id", nullable = false)
    public AccountabilityRecord record;

    @Column(name = "occurred_at", nullable = false)
    public Instant occurredAt;

    @Enumerated(EnumType.STRING)
    @Column(name = "source", nullable = false, length = 32)
    public OffenceSource source;

    @Column(name = "actor", nullable = false, length = 256)
    public String actor;

    @Column(name = "action", nullable = false, length = 64)
    public String action;

    @Column(name = "detail", length = 512)
    public String detail;
}


package com.trustplatform.accountability.entity;

import com.trustplatform.accountability.domain.AccountabilityStatus;
import com.trustplatform.accountability.domain.OffenceSource;
import com.trustplatform.accountability.domain.OffenceType;
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

@Entity
@Table(name = "case_event")
public class CaseEvent extends PanacheEntityBase {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "event_id")
    public Long eventId;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "record_id", nullable = false)
    public AccountabilityRecord record;

    @Column(name = "occurred_at", nullable = false)
    public Instant occurredAt;

    @Enumerated(EnumType.STRING)
    @Column(name = "offence_type", nullable = false, length = 32)
    public OffenceType offenceType;

    /**
     * Which authority produced this signal — the platform's own conduct engine, an external
     * anti-cheat vendor, or a game operator. This is what makes the record auditable.
     */
    @Enumerated(EnumType.STRING)
    @Column(name = "source", nullable = false, length = 32)
    public OffenceSource source;

    @Column(name = "score", nullable = false)
    public int score;

    @Column(name = "evidence_link", length = 512)
    public String evidenceLink;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 32)
    public AccountabilityStatus status;
}


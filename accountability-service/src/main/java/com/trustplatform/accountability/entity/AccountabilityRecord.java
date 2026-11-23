package com.trustplatform.accountability.entity;

import com.trustplatform.accountability.domain.AccountabilityStatus;
import io.quarkus.hibernate.orm.panache.PanacheEntityBase;
import jakarta.persistence.CascadeType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.OneToMany;
import jakarta.persistence.OneToOne;
import jakarta.persistence.Table;

import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "accountability_record")
public class AccountabilityRecord extends PanacheEntityBase {

    @Id
    @Column(name = "record_id", nullable = false, length = 36)
    public String recordId;

    @OneToOne(optional = false)
    @JoinColumn(name = "connection_id", nullable = false, unique = true)
    public GameConnection connection;

    @Column(name = "profile_id", nullable = false, length = 128)
    public String profileId;

    @Column(name = "operator_id", nullable = false, length = 128)
    public String operatorId;

    @Column(name = "game_id", nullable = false, length = 128)
    public String gameId;

    @Column(name = "conduct_score", nullable = false)
    public int conductScore;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 32)
    public AccountabilityStatus status;

    @OneToMany(mappedBy = "record", cascade = CascadeType.ALL, orphanRemoval = true)
    public List<CaseEvent> caseEvents = new ArrayList<>();

    public void addCaseEvent(CaseEvent event) {
        event.record = this;
        caseEvents.add(event);
    }
}

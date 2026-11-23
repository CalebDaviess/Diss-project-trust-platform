package com.trustplatform.accountability.repository;

import com.trustplatform.accountability.domain.AccountabilityStatus;
import com.trustplatform.accountability.entity.CaseEvent;
import io.quarkus.hibernate.orm.panache.PanacheRepositoryBase;
import jakarta.enterprise.context.ApplicationScoped;

import java.util.List;

@ApplicationScoped
public class CaseEventRepository implements PanacheRepositoryBase<CaseEvent, Long> {

    public List<CaseEvent> listByRecordId(String recordId) {
        return list("record.recordId = ?1 order by occurredAt", recordId);
    }

    public CaseEvent findLatestByRecordId(String recordId) {
        return find("record.recordId = ?1 order by occurredAt desc, eventId desc", recordId).firstResult();
    }

    public List<CaseEvent> listPendingByConnectionId(String connectionId) {
        return list("record.connection.connectionId = ?1 and status = ?2 order by occurredAt",
                connectionId,
                AccountabilityStatus.PENDING);
    }

    public long countConfirmedByConnectionId(String connectionId) {
        return count("record.connection.connectionId = ?1 and status = ?2", connectionId, AccountabilityStatus.CONFIRMED);
    }
}


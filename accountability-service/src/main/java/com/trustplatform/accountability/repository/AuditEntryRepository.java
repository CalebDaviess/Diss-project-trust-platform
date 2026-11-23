package com.trustplatform.accountability.repository;

import com.trustplatform.accountability.entity.AuditEntry;
import io.quarkus.hibernate.orm.panache.PanacheRepositoryBase;
import jakarta.enterprise.context.ApplicationScoped;

import java.util.List;

@ApplicationScoped
public class AuditEntryRepository implements PanacheRepositoryBase<AuditEntry, Long> {

    /** The record's full audit trail in chronological order (oldest first). */
    public List<AuditEntry> listByRecordId(String recordId) {
        return list("record.recordId = ?1 order by occurredAt, entryId", recordId);
    }
}


package com.trustplatform.accountability.repository;

import com.trustplatform.accountability.entity.AccountabilityRecord;
import io.quarkus.hibernate.orm.panache.PanacheRepositoryBase;
import jakarta.enterprise.context.ApplicationScoped;

@ApplicationScoped
public class AccountabilityRecordRepository implements PanacheRepositoryBase<AccountabilityRecord, String> {

    public AccountabilityRecord findByConnectionId(String connectionId) {
        return find("connection.connectionId", connectionId).firstResult();
    }
}

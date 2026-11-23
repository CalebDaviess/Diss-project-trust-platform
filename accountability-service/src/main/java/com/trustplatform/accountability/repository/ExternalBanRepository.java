package com.trustplatform.accountability.repository;

import com.trustplatform.accountability.entity.ExternalBan;
import io.quarkus.hibernate.orm.panache.PanacheRepositoryBase;
import io.quarkus.panache.common.Sort;
import jakarta.enterprise.context.ApplicationScoped;

import java.time.Instant;

@ApplicationScoped
public class ExternalBanRepository implements PanacheRepositoryBase<ExternalBan, String> {

    public boolean hasActiveBan(String connectionId, Instant now) {
        return count("connectionId = ?1 and bannedAt <= ?2 and (expiresAt is null or expiresAt > ?2)", connectionId, now) > 0;
    }

    public java.util.List<ExternalBan> listByConnectionId(String connectionId) {
        return list("connectionId", connectionId);
    }

    /** The most recent active ban for a connection, or null when none is active. */
    public ExternalBan findActiveBan(String connectionId, Instant now) {
        return find("connectionId = ?1 and bannedAt <= ?2 and (expiresAt is null or expiresAt > ?2)",
                Sort.by("bannedAt").descending(), connectionId, now)
                .firstResult();
    }
}

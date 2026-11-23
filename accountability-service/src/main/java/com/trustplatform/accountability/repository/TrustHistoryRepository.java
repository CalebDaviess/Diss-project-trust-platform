package com.trustplatform.accountability.repository;

import com.trustplatform.accountability.entity.TrustHistory;
import io.quarkus.hibernate.orm.panache.PanacheRepositoryBase;
import io.quarkus.panache.common.Sort;
import jakarta.enterprise.context.ApplicationScoped;

import java.util.List;

@ApplicationScoped
public class TrustHistoryRepository implements PanacheRepositoryBase<TrustHistory, String> {

    /** A profile's trust-change points, oldest first. */
    public List<TrustHistory> listByProfile(String profileId) {
        return list("profileId = ?1", Sort.by("occurredAt").ascending(), profileId);
    }
}

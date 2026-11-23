package com.trustplatform.accountability.repository;

import com.trustplatform.accountability.entity.Appeal;
import io.quarkus.hibernate.orm.panache.PanacheRepositoryBase;
import io.quarkus.panache.common.Sort;
import jakarta.enterprise.context.ApplicationScoped;

import java.util.List;

@ApplicationScoped
public class AppealRepository implements PanacheRepositoryBase<Appeal, String> {

    /** All appeals for a profile, newest first. */
    public List<Appeal> listByProfile(String profileId) {
        return list("profileId = ?1", Sort.by("submittedAt").descending(), profileId);
    }

    /** The open (submitted, not yet resolved) appeal for a connection, or null. */
    public Appeal findOpenByConnection(String connectionId) {
        return find("connectionId = ?1 and status = 'submitted'", connectionId).firstResult();
    }

    /**
     * A denied (upheld) appeal for a connection, or null. A denied sanction is final, so this is used
     * to stop a player re-appealing the same sanction after it has already been reviewed and upheld.
     */
    public Appeal findDeniedByConnection(String connectionId) {
        return find("connectionId = ?1 and status = 'denied'", connectionId).firstResult();
    }

    /** An appeal by id only if it belongs to the given profile, else null. */
    public Appeal findOwned(String profileId, String appealId) {
        return find("appealId = ?1 and profileId = ?2", appealId, profileId).firstResult();
    }
}

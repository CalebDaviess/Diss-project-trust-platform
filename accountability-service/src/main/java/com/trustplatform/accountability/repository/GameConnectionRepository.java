package com.trustplatform.accountability.repository;

import com.trustplatform.accountability.entity.GameConnection;
import io.quarkus.hibernate.orm.panache.PanacheRepositoryBase;
import jakarta.enterprise.context.ApplicationScoped;

import java.util.List;

@ApplicationScoped
public class GameConnectionRepository implements PanacheRepositoryBase<GameConnection, String> {

    public List<GameConnection> listOtherConnections(String profileId, String connectionId) {
        return list("profile.profileId = ?1 and connectionId <> ?2", profileId, connectionId);
    }

    /** All non-removed connections for a profile, newest first. */
    public List<GameConnection> listActiveByProfile(String profileId) {
        return list("profile.profileId = ?1 and status <> 'removed' order by linkedAt desc nulls last", profileId);
    }

    /** A connection by id only if it belongs to the given profile, else null. */
    public GameConnection findOwned(String profileId, String connectionId) {
        return find("connectionId = ?1 and profile.profileId = ?2", connectionId, profileId).firstResult();
    }
}


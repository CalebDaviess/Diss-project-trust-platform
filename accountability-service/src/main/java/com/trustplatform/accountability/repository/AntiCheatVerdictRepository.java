package com.trustplatform.accountability.repository;

import com.trustplatform.accountability.entity.AntiCheatVerdict;
import io.quarkus.hibernate.orm.panache.PanacheRepositoryBase;
import jakarta.enterprise.context.ApplicationScoped;

import java.util.List;

@ApplicationScoped
public class AntiCheatVerdictRepository implements PanacheRepositoryBase<AntiCheatVerdict, String> {

    public List<AntiCheatVerdict> listByConnectionId(String connectionId) {
        return list("connectionId", connectionId);
    }
}


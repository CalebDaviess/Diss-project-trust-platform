package com.trustplatform.accountability.repository;

import com.trustplatform.accountability.entity.PlayerProfile;
import io.quarkus.hibernate.orm.panache.PanacheRepositoryBase;
import jakarta.enterprise.context.ApplicationScoped;

@ApplicationScoped
public class PlayerProfileRepository implements PanacheRepositoryBase<PlayerProfile, String> {
}


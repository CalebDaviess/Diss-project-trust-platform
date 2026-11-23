package com.trustplatform.accountability.repository;

import com.trustplatform.accountability.entity.UserCredential;
import io.quarkus.hibernate.orm.panache.PanacheRepositoryBase;
import jakarta.enterprise.context.ApplicationScoped;

@ApplicationScoped
public class UserCredentialRepository implements PanacheRepositoryBase<UserCredential, String> {
}


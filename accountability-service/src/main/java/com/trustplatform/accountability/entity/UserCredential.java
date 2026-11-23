package com.trustplatform.accountability.entity;

import io.quarkus.hibernate.orm.panache.PanacheEntityBase;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

/**
 * A login credential for the platform. Maps a username to a bcrypt password hash and the
 * hashed platform identity ({@code profileId}) that becomes the JWT {@code sub}.
 *
 * <p>Raw passwords are never stored — only the bcrypt (modular-crypt) hash. See Identity-Model.
 */
@Entity
@Table(name = "user_credential")
public class UserCredential extends PanacheEntityBase {

    @Id
    @Column(name = "username", nullable = false, length = 255)
    public String username;

    @Column(name = "profile_id", nullable = false, length = 128)
    public String profileId;

    @Column(name = "password_hash", nullable = false, length = 255)
    public String passwordHash;

    @Column(name = "roles", nullable = false, length = 255)
    public String roles = "player";
}


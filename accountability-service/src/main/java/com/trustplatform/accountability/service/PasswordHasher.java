package com.trustplatform.accountability.service;

import io.quarkus.elytron.security.common.BcryptUtil;
import jakarta.enterprise.context.ApplicationScoped;
import org.jboss.logging.Logger;
import org.wildfly.security.password.Password;
import org.wildfly.security.password.PasswordFactory;
import org.wildfly.security.password.WildFlyElytronPasswordProvider;
import org.wildfly.security.password.interfaces.BCryptPassword;
import org.wildfly.security.password.util.ModularCrypt;

/**
 * Bcrypt password hashing and verification.
 *
 * <p>Hashing uses Quarkus {@link BcryptUtil}; verification uses the Elytron
 * {@link PasswordFactory} so we can check a raw password against a stored
 * modular-crypt bcrypt hash without a third-party dependency.
 */
@ApplicationScoped
public class PasswordHasher {

    private static final Logger LOG = Logger.getLogger(PasswordHasher.class);

    /** Produce a bcrypt (modular-crypt) hash for a raw password. */
    public String hash(String rawPassword) {
        return BcryptUtil.bcryptHash(rawPassword);
    }

    /** True if {@code rawPassword} matches the stored bcrypt hash; false on any mismatch or malformed hash. */
    public boolean matches(String rawPassword, String storedHash) {
        if (rawPassword == null || storedHash == null) {
            return false;
        }
        try {
            PasswordFactory factory = PasswordFactory.getInstance(
                    BCryptPassword.ALGORITHM_BCRYPT, new WildFlyElytronPasswordProvider());
            Password decoded = ModularCrypt.decode(storedHash);
            Password restored = factory.translate(decoded);
            return factory.verify(restored, rawPassword.toCharArray());
        } catch (Exception e) {
            LOG.debug("Password verification failed for a malformed or unsupported hash", e);
            return false;
        }
    }
}


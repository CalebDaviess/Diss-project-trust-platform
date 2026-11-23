package com.trustplatform.accountability.service;

import com.trustplatform.accountability.entity.UserCredential;
import com.trustplatform.accountability.repository.UserCredentialRepository;
import io.quarkus.runtime.StartupEvent;
import jakarta.enterprise.event.Observes;
import jakarta.inject.Singleton;
import jakarta.transaction.Transactional;
import org.eclipse.microprofile.config.inject.ConfigProperty;
import org.jboss.logging.Logger;

/**
 * Seeds a single demo login on startup so the auth flow is usable locally and in tests.
 *
 * <p>Guarded by {@code accountability.auth.seed-demo-user} (true only in the {@code dev} and
 * {@code test} profiles). Never runs in production — real accounts come from identity
 * verification (designed, not built). The demo password lives only here and in docs.
 */
@Singleton
public class DemoUserSeeder {

    private static final Logger LOG = Logger.getLogger(DemoUserSeeder.class);

    /** Well-known demo credentials (dev/test only). */
    public static final String DEMO_USERNAME = "player@example.com";
    public static final String DEMO_PASSWORD = "demo-password";
    public static final String DEMO_PROFILE_ID = "sha256:demo-player";

    private final UserCredentialRepository userCredentialRepository;
    private final PasswordHasher passwordHasher;
    private final boolean seedEnabled;

    public DemoUserSeeder(
            UserCredentialRepository userCredentialRepository,
            PasswordHasher passwordHasher,
            @ConfigProperty(name = "accountability.auth.seed-demo-user", defaultValue = "false") boolean seedEnabled) {
        this.userCredentialRepository = userCredentialRepository;
        this.passwordHasher = passwordHasher;
        this.seedEnabled = seedEnabled;
    }

    @Transactional
    void onStart(@Observes StartupEvent event) {
        if (!seedEnabled) {
            return;
        }
        if (userCredentialRepository.findById(DEMO_USERNAME) != null) {
            return;
        }
        UserCredential demo = new UserCredential();
        demo.username = DEMO_USERNAME;
        demo.profileId = DEMO_PROFILE_ID;
        demo.passwordHash = passwordHasher.hash(DEMO_PASSWORD);
        demo.roles = "player";
        userCredentialRepository.persist(demo);
        LOG.infof("Seeded demo login '%s' (dev/test only)", DEMO_USERNAME);
    }
}


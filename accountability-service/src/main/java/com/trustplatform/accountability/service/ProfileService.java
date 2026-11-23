package com.trustplatform.accountability.service;

import com.trustplatform.accountability.dto.ProfileView;
import com.trustplatform.accountability.entity.PlayerProfile;
import com.trustplatform.accountability.repository.PlayerProfileRepository;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.transaction.Transactional;

import java.time.Instant;

/**
 * Account-level reads and the "coming of age" transition. A brand-new account may not have a
 * persisted profile yet (profiles are created lazily on first link/sample, except for registered
 * accounts which get one up-front); in that case a default adult view is synthesised so the portal
 * always has something to show.
 */
@ApplicationScoped
public class ProfileService {

    private final PlayerProfileRepository playerProfileRepository;

    public ProfileService(PlayerProfileRepository playerProfileRepository) {
        this.playerProfileRepository = playerProfileRepository;
    }

    @Transactional
    public ProfileView overview(String profileId) {
        PlayerProfile profile = playerProfileRepository.findById(profileId);
        if (profile == null) {
            // No profile row yet: a clean, full-access adult account by default.
            return new ProfileView(profileId, PlayerProfile.DEFAULT_GLOBAL_TRUST_SCORE, Instant.now(),
                    PlayerProfile.ACCOUNT_ADULT, false, null, null, null, true);
        }
        return toView(profile);
    }

    /**
     * Convert a guardian-controlled minor account into a normal adult account once the holder has
     * turned 18 and verified their own ID (the verification itself is mocked in the portal). Lifts
     * guardian control and grants full access. No-op for an account that is already adult.
     */
    @Transactional
    public ProfileView comeOfAge(String profileId) {
        PlayerProfile profile = playerProfileRepository.findById(profileId);
        if (profile == null) {
            // Nothing stored yet — already effectively an adult account.
            return overview(profileId);
        }
        if (profile.isGuardianMinor()) {
            profile.accountType = PlayerProfile.ACCOUNT_ADULT;
            profile.matureAccessAllowed = true;
            profile.guardianName = null;
            profile.guardianEmail = null;
        }
        return toView(profile);
    }

    private static ProfileView toView(PlayerProfile profile) {
        return new ProfileView(
                profile.profileId,
                profile.globalTrustScore,
                profile.createdAt,
                profile.accountType,
                profile.isGuardianMinor(),
                profile.holderName,
                profile.guardianName,
                profile.guardianEmail,
                profile.matureAccessAllowed);
    }
}

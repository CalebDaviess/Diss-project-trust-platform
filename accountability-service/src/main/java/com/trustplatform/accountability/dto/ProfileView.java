package com.trustplatform.accountability.dto;

import java.time.Instant;

/**
 * Profile-level account overview (GET /profile). Drives the portal's account-type banner,
 * guardian details and the "coming of age" upgrade — independent of any game connection, so it
 * works for a brand-new account with no linked games.
 *
 * @param profileId           the hashed platform identity
 * @param globalTrustScore    current global trust score
 * @param createdAt           account creation time (trust-graph anchor)
 * @param accountType         {@code ADULT} or {@code GUARDIAN_MINOR}
 * @param guardianControlled  true for an under-18, guardian-controlled account
 * @param holderName          the account holder's display name (the child, for a guardian account)
 * @param guardianName        the vouching guardian's name (guardian accounts only)
 * @param guardianEmail       the guardian's email (guardian accounts only)
 * @param matureAccessAllowed whether this account may reach 18+ rated games
 */
public record ProfileView(
        String profileId,
        int globalTrustScore,
        Instant createdAt,
        String accountType,
        boolean guardianControlled,
        String holderName,
        String guardianName,
        String guardianEmail,
        boolean matureAccessAllowed
) {
}

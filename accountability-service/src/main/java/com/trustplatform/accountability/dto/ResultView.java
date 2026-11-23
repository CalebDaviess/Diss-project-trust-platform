package com.trustplatform.accountability.dto;

import com.trustplatform.accountability.domain.AccountabilityStatus;

import java.util.List;

/**
 * The per-connection view returned to the portal. {@code gameName}/{@code gameImageUrl}/
 * {@code gameProvider} describe the current game. {@code linkedGamesCount} and
 * {@code activeBanCount} are profile-level totals (so "Linked games" counts real linked games, not
 * just games with offences, and never collapses when a sanction is cleared).
 */
public record ResultView(
        String gameConnectionId,
        String gameName,
        String gameImageUrl,
        String gameProvider,
        int globalTrustScore,
        int linkedGamesCount,
        int activeBanCount,
        Integer conductScore,
        AccountabilityStatus status,
        List<CrossGameSignalView> crossGameSignals,
        List<CaseView> caseHistory,
        List<AuditView> auditTrail
) {
}

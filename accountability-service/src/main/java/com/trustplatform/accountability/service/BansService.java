package com.trustplatform.accountability.service;

import com.trustplatform.accountability.dto.BanView;
import com.trustplatform.accountability.entity.ExternalBan;
import com.trustplatform.accountability.entity.GameConnection;
import com.trustplatform.accountability.repository.AppealRepository;
import com.trustplatform.accountability.repository.ExternalBanRepository;
import com.trustplatform.accountability.repository.GameConnectionRepository;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.transaction.Transactional;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

/** Lists the player's currently-active bans across all linked games, with display and appeal metadata. */
@ApplicationScoped
public class BansService {

    private final GameConnectionRepository gameConnectionRepository;
    private final ExternalBanRepository externalBanRepository;
    private final AppealRepository appealRepository;

    public BansService(GameConnectionRepository gameConnectionRepository,
                       ExternalBanRepository externalBanRepository,
                       AppealRepository appealRepository) {
        this.gameConnectionRepository = gameConnectionRepository;
        this.externalBanRepository = externalBanRepository;
        this.appealRepository = appealRepository;
    }

    @Transactional
    public List<BanView> listActive(String profileId) {
        Instant now = Instant.now();
        List<BanView> bans = new ArrayList<>();
        for (GameConnection connection : gameConnectionRepository.listActiveByProfile(profileId)) {
            ExternalBan ban = externalBanRepository.findActiveBan(connection.connectionId, now);
            if (ban == null) {
                continue;
            }
            String appealStatus = resolveAppealStatus(connection.connectionId);
            bans.add(new BanView(
                    connection.connectionId, connection.gameId, connection.gameName, connection.imageUrl,
                    connection.provider, connection.operatorId, ban.banType, ban.reason,
                    ban.bannedAt, ban.expiresAt, ban.appealable, appealStatus));
        }
        return bans;
    }

    private String resolveAppealStatus(String connectionId) {
        if (appealRepository.findOpenByConnection(connectionId) != null) {
            return "open";
        }
        if (appealRepository.findDeniedByConnection(connectionId) != null) {
            return "denied";
        }
        return "none";
    }
}

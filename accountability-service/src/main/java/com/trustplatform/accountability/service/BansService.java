package com.trustplatform.accountability.service;

import com.trustplatform.accountability.dto.BanView;
import com.trustplatform.accountability.entity.ExternalBan;
import com.trustplatform.accountability.entity.GameConnection;
import com.trustplatform.accountability.repository.ExternalBanRepository;
import com.trustplatform.accountability.repository.GameConnectionRepository;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.transaction.Transactional;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

/** Lists the player's currently-active bans across all linked games, with display metadata. */
@ApplicationScoped
public class BansService {

    private final GameConnectionRepository gameConnectionRepository;
    private final ExternalBanRepository externalBanRepository;

    public BansService(GameConnectionRepository gameConnectionRepository,
                       ExternalBanRepository externalBanRepository) {
        this.gameConnectionRepository = gameConnectionRepository;
        this.externalBanRepository = externalBanRepository;
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
            bans.add(new BanView(
                    connection.connectionId, connection.gameId, connection.gameName, connection.imageUrl,
                    connection.provider, connection.operatorId, ban.banType, ban.reason,
                    ban.bannedAt, ban.expiresAt, ban.appealable));
        }
        return bans;
    }
}

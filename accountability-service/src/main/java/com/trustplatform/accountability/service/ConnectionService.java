package com.trustplatform.accountability.service;

import com.trustplatform.accountability.dto.ConnectionView;
import com.trustplatform.accountability.dto.CreateConnectionRequest;
import com.trustplatform.accountability.entity.GameConnection;
import com.trustplatform.accountability.entity.PlayerProfile;
import com.trustplatform.accountability.repository.GameConnectionRepository;
import com.trustplatform.accountability.repository.PlayerProfileRepository;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.transaction.Transactional;
import jakarta.ws.rs.ForbiddenException;
import jakarta.ws.rs.NotFoundException;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

/**
 * Player-initiated game linking. A player links a game account to their verified platform identity
 * (the JWT {@code sub} / {@code profileId}); incoming operator reports later correlate to the player
 * by {@code (operatorId, operatorAccountRef)} without the operator ever learning the platform id.
 */
@ApplicationScoped
public class ConnectionService {

    private final GameConnectionRepository gameConnectionRepository;
    private final PlayerProfileRepository playerProfileRepository;

    public ConnectionService(GameConnectionRepository gameConnectionRepository,
                             PlayerProfileRepository playerProfileRepository) {
        this.gameConnectionRepository = gameConnectionRepository;
        this.playerProfileRepository = playerProfileRepository;
    }

    @Transactional
    public List<ConnectionView> list(String profileId) {
        return gameConnectionRepository.listActiveByProfile(profileId).stream()
                .map(ConnectionService::toView)
                .toList();
    }

    @Transactional
    public ConnectionView link(String profileId, CreateConnectionRequest request) {
        PlayerProfile profile = playerProfileRepository.findById(profileId);
        if (profile == null) {
            profile = new PlayerProfile();
            profile.profileId = profileId;
            playerProfileRepository.persist(profile);
        }

        // Age gate: a guardian-controlled minor account without 18+ consent cannot link a mature game.
        if (request.isMature() && profile.isGuardianMinor() && !profile.matureAccessAllowed) {
            throw new ForbiddenException(
                    "This game is rated 18+. A parent or guardian must allow 18+ games on this account.");
        }

        String operatorId = request.operatorId() != null && !request.operatorId().isBlank()
                ? request.operatorId().trim()
                : request.provider().trim();

        // Re-link an existing (active) connection for the same game + provider rather than duplicating.
        GameConnection existing = gameConnectionRepository.listActiveByProfile(profileId).stream()
                .filter(c -> c.gameId.equals(request.gameId())
                        && (operatorId.equals(c.operatorId)
                        || (request.provider() != null && request.provider().equalsIgnoreCase(c.provider))))
                .findFirst()
                .orElse(null);

        GameConnection connection = existing != null ? existing : new GameConnection();
        if (existing == null) {
            connection.connectionId = "gc-" + UUID.randomUUID();
            connection.profile = profile;
        }
        connection.operatorId = operatorId;
        connection.gameId = request.gameId();
        connection.gameName = request.gameName();
        connection.provider = request.provider();
        connection.operatorAccountRef = request.operatorAccountRef();
        connection.imageUrl = request.imageUrl();
        connection.status = "active";
        connection.linkedAt = Instant.now();
        if (existing == null) {
            gameConnectionRepository.persist(connection);
        }
        return toView(connection);
    }

    @Transactional
    public void unlink(String profileId, String connectionId) {
        GameConnection connection = gameConnectionRepository.findOwned(profileId, connectionId);
        if (connection == null || "removed".equals(connection.status)) {
            throw new NotFoundException("Connection not found");
        }
        // Soft-delete: records/audit history reference this connection, so we keep the row.
        connection.status = "removed";
    }

    private static ConnectionView toView(GameConnection c) {
        return new ConnectionView(
                c.connectionId, c.gameId, c.gameName, c.operatorId,
                c.provider, c.operatorAccountRef, c.imageUrl, c.status, c.linkedAt);
    }
}

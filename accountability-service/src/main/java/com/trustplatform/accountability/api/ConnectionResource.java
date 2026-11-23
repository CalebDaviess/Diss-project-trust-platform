package com.trustplatform.accountability.api;

import com.trustplatform.accountability.dto.ConnectionView;
import com.trustplatform.accountability.dto.CreateConnectionRequest;
import com.trustplatform.accountability.dto.GameSearchResult;
import com.trustplatform.accountability.service.ConnectionService;
import com.trustplatform.accountability.service.GameCatalogService;
import com.trustplatform.accountability.service.ProfileIdResolver;
import jakarta.annotation.security.RolesAllowed;
import jakarta.validation.Valid;
import jakarta.ws.rs.Consumes;
import jakarta.ws.rs.DELETE;
import jakarta.ws.rs.GET;
import jakarta.ws.rs.HeaderParam;
import jakarta.ws.rs.POST;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.PathParam;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.QueryParam;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;

import java.util.List;

/**
 * Player-facing endpoints for linking games to the signed-in identity and searching the game
 * catalogue. Identity is the JWT {@code sub} (dev/test may fall back to {@code X-Profile-Id}).
 */
@Path("/")
@Consumes(MediaType.APPLICATION_JSON)
@Produces(MediaType.APPLICATION_JSON)
public class ConnectionResource {

    private final ConnectionService connectionService;
    private final GameCatalogService gameCatalogService;
    private final ProfileIdResolver profileIdResolver;

    public ConnectionResource(ConnectionService connectionService,
                              GameCatalogService gameCatalogService,
                              ProfileIdResolver profileIdResolver) {
        this.connectionService = connectionService;
        this.gameCatalogService = gameCatalogService;
        this.profileIdResolver = profileIdResolver;
    }

    @GET
    @Path("/connections")
    @RolesAllowed("player")
    public List<ConnectionView> list(@HeaderParam("X-Profile-Id") String headerProfileId) {
        return connectionService.list(profileIdResolver.resolve(headerProfileId));
    }

    @POST
    @Path("/connections")
    @RolesAllowed("player")
    public ConnectionView link(@HeaderParam("X-Profile-Id") String headerProfileId,
                               @Valid CreateConnectionRequest request) {
        return connectionService.link(profileIdResolver.resolve(headerProfileId), request);
    }

    @DELETE
    @Path("/connections/{connectionId}")
    @RolesAllowed("player")
    public Response unlink(@HeaderParam("X-Profile-Id") String headerProfileId,
                           @PathParam("connectionId") String connectionId) {
        connectionService.unlink(profileIdResolver.resolve(headerProfileId), connectionId);
        return Response.noContent().build();
    }

    @GET
    @Path("/games/search")
    @RolesAllowed("player")
    public List<GameSearchResult> searchGames(@QueryParam("q") String query) {
        return gameCatalogService.search(query);
    }
}

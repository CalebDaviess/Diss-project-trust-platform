package com.trustplatform.accountability.api;

import com.trustplatform.accountability.dto.AppealView;
import com.trustplatform.accountability.dto.AppealsOverview;
import com.trustplatform.accountability.dto.ResolveAppealRequest;
import com.trustplatform.accountability.dto.SubmitAppealRequest;
import com.trustplatform.accountability.service.AppealService;
import com.trustplatform.accountability.service.ProfileIdResolver;
import jakarta.annotation.security.RolesAllowed;
import jakarta.validation.Valid;
import jakarta.ws.rs.Consumes;
import jakarta.ws.rs.GET;
import jakarta.ws.rs.HeaderParam;
import jakarta.ws.rs.NotFoundException;
import jakarta.ws.rs.POST;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.PathParam;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.core.MediaType;
import org.eclipse.microprofile.config.inject.ConfigProperty;

/**
 * Player appeals (Contract: governance/appeals). Submitting is always available to the player;
 * resolving is simulated governance, gated to dev/test by
 * {@code accountability.demo.allow-appeal-resolution} (404 in production, where a real reviewer
 * decides the outcome).
 */
@Path("/appeals")
@Consumes(MediaType.APPLICATION_JSON)
@Produces(MediaType.APPLICATION_JSON)
public class AppealResource {

    private final AppealService appealService;
    private final ProfileIdResolver profileIdResolver;
    private final boolean allowResolution;

    public AppealResource(AppealService appealService,
                          ProfileIdResolver profileIdResolver,
                          @ConfigProperty(name = "accountability.demo.allow-appeal-resolution",
                                  defaultValue = "false") boolean allowResolution) {
        this.appealService = appealService;
        this.profileIdResolver = profileIdResolver;
        this.allowResolution = allowResolution;
    }

    @GET
    @RolesAllowed("player")
    public AppealsOverview overview(@HeaderParam("X-Profile-Id") String headerProfileId) {
        return appealService.overview(profileIdResolver.resolve(headerProfileId));
    }

    @POST
    @RolesAllowed("player")
    public AppealView submit(@HeaderParam("X-Profile-Id") String headerProfileId,
                             @Valid SubmitAppealRequest request) {
        return appealService.submit(profileIdResolver.resolve(headerProfileId), request);
    }

    /**
     * Simulated review decision. In production this is an operator/governance action; here it lets
     * the demo "pretend the studio reviewed the case" and approve/deny it.
     */
    @POST
    @Path("/{appealId}/resolve")
    @RolesAllowed("player")
    public AppealView resolve(@HeaderParam("X-Profile-Id") String headerProfileId,
                              @PathParam("appealId") String appealId,
                              @Valid ResolveAppealRequest request) {
        if (!allowResolution) {
            throw new NotFoundException();
        }
        return appealService.resolve(profileIdResolver.resolve(headerProfileId), appealId, request);
    }
}

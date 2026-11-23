package com.trustplatform.accountability.api;

import com.trustplatform.accountability.dto.TrustPointView;
import com.trustplatform.accountability.service.ProfileIdResolver;
import com.trustplatform.accountability.service.TrustHistoryService;
import jakarta.annotation.security.RolesAllowed;
import jakarta.ws.rs.GET;
import jakarta.ws.rs.HeaderParam;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.core.MediaType;

import java.util.List;

/** The player's trust-over-time series (My Record / Dashboard chart). */
@Path("/trust-history")
@Produces(MediaType.APPLICATION_JSON)
public class TrustHistoryResource {

    private final TrustHistoryService trustHistoryService;
    private final ProfileIdResolver profileIdResolver;

    public TrustHistoryResource(TrustHistoryService trustHistoryService, ProfileIdResolver profileIdResolver) {
        this.trustHistoryService = trustHistoryService;
        this.profileIdResolver = profileIdResolver;
    }

    @GET
    @RolesAllowed("player")
    public List<TrustPointView> series(@HeaderParam("X-Profile-Id") String headerProfileId) {
        return trustHistoryService.series(profileIdResolver.resolve(headerProfileId));
    }
}

package com.trustplatform.accountability.api;

import com.trustplatform.accountability.dto.ProfileView;
import com.trustplatform.accountability.service.ProfileIdResolver;
import com.trustplatform.accountability.service.ProfileService;
import jakarta.annotation.security.RolesAllowed;
import jakarta.ws.rs.GET;
import jakarta.ws.rs.HeaderParam;
import jakarta.ws.rs.POST;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.core.MediaType;

/**
 * Account-level profile overview and the "coming of age" upgrade. Used by the portal to show the
 * account-type banner (adult vs guardian-controlled), guardian details and 18+ access, and to let
 * a holder who has turned 18 convert their account to full adult access.
 */
@Path("/profile")
@Produces(MediaType.APPLICATION_JSON)
public class ProfileResource {

    private final ProfileService profileService;
    private final ProfileIdResolver profileIdResolver;

    public ProfileResource(ProfileService profileService, ProfileIdResolver profileIdResolver) {
        this.profileService = profileService;
        this.profileIdResolver = profileIdResolver;
    }

    @GET
    @RolesAllowed("player")
    public ProfileView overview(@HeaderParam("X-Profile-Id") String headerProfileId) {
        return profileService.overview(profileIdResolver.resolve(headerProfileId));
    }

    /**
     * Convert a guardian-controlled minor account to a full adult account once the holder has
     * turned 18 and verified their own ID (verification is mocked in the portal).
     */
    @POST
    @Path("/verify-adult")
    @RolesAllowed("player")
    public ProfileView verifyAdult(@HeaderParam("X-Profile-Id") String headerProfileId) {
        return profileService.comeOfAge(profileIdResolver.resolve(headerProfileId));
    }
}

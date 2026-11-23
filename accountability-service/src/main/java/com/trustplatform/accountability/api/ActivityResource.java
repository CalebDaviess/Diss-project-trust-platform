package com.trustplatform.accountability.api;

import com.trustplatform.accountability.dto.ActivityItem;
import com.trustplatform.accountability.service.ActivityService;
import com.trustplatform.accountability.service.ProfileIdResolver;
import jakarta.annotation.security.RolesAllowed;
import jakarta.ws.rs.GET;
import jakarta.ws.rs.HeaderParam;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.QueryParam;
import jakarta.ws.rs.core.MediaType;

import java.util.List;

/** The player's cross-game activity feed (My Record tab). */
@Path("/activity")
@Produces(MediaType.APPLICATION_JSON)
public class ActivityResource {

    private final ActivityService activityService;
    private final ProfileIdResolver profileIdResolver;

    public ActivityResource(ActivityService activityService, ProfileIdResolver profileIdResolver) {
        this.activityService = activityService;
        this.profileIdResolver = profileIdResolver;
    }

    @GET
    @RolesAllowed("player")
    public List<ActivityItem> feed(@HeaderParam("X-Profile-Id") String headerProfileId,
                                   @QueryParam("connectionId") String connectionId) {
        return activityService.feed(profileIdResolver.resolve(headerProfileId), connectionId);
    }
}

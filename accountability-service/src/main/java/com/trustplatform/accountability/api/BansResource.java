package com.trustplatform.accountability.api;

import com.trustplatform.accountability.dto.BanView;
import com.trustplatform.accountability.dto.ResultView;
import com.trustplatform.accountability.dto.SimulateBanRequest;
import com.trustplatform.accountability.service.AccountabilityService;
import com.trustplatform.accountability.service.BansService;
import com.trustplatform.accountability.service.ProfileIdResolver;
import jakarta.annotation.security.RolesAllowed;
import jakarta.validation.Valid;
import jakarta.ws.rs.Consumes;
import jakarta.ws.rs.GET;
import jakarta.ws.rs.HeaderParam;
import jakarta.ws.rs.NotFoundException;
import jakarta.ws.rs.POST;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.core.MediaType;
import org.eclipse.microprofile.config.inject.ConfigProperty;

import java.util.List;

/** The player's active bans, plus a dev-only hook to simulate a typed operator ban. */
@Path("/")
@Consumes(MediaType.APPLICATION_JSON)
@Produces(MediaType.APPLICATION_JSON)
public class BansResource {

    private final BansService bansService;
    private final AccountabilityService accountabilityService;
    private final ProfileIdResolver profileIdResolver;
    private final boolean allowSimulatedBan;

    public BansResource(BansService bansService,
                        AccountabilityService accountabilityService,
                        ProfileIdResolver profileIdResolver,
                        @ConfigProperty(name = "accountability.demo.allow-simulated-ban",
                                defaultValue = "false") boolean allowSimulatedBan) {
        this.bansService = bansService;
        this.accountabilityService = accountabilityService;
        this.profileIdResolver = profileIdResolver;
        this.allowSimulatedBan = allowSimulatedBan;
    }

    @GET
    @Path("/bans")
    @RolesAllowed("player")
    public List<BanView> list(@HeaderParam("X-Profile-Id") String headerProfileId) {
        return bansService.listActive(profileIdResolver.resolve(headerProfileId));
    }

    @POST
    @Path("/dev/bans/simulate")
    @RolesAllowed("player")
    public ResultView simulate(@HeaderParam("X-Profile-Id") String headerProfileId,
                               @Valid SimulateBanRequest request) {
        if (!allowSimulatedBan) {
            throw new NotFoundException();
        }
        boolean appealable = request.appealable() == null || request.appealable();
        return accountabilityService.simulateOperatorBan(
                profileIdResolver.resolve(headerProfileId), request.connectionId(),
                request.banType(), request.durationDays(), appealable);
    }
}

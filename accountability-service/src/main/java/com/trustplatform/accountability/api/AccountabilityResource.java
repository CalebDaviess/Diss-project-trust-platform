package com.trustplatform.accountability.api;

import com.trustplatform.accountability.dto.AntiCheatVerdictRequest;
import com.trustplatform.accountability.dto.AntiCheatVerdictResponse;
import com.trustplatform.accountability.dto.BanNotificationRequest;
import com.trustplatform.accountability.dto.BanNotificationResponse;
import com.trustplatform.accountability.dto.ResultView;
import com.trustplatform.accountability.dto.SampleSubmission;
import com.trustplatform.accountability.dto.SimulateAntiCheatRequest;
import com.trustplatform.accountability.service.AccountabilityService;
import com.trustplatform.accountability.service.ProfileIdResolver;
import jakarta.annotation.security.RolesAllowed;
import jakarta.validation.Valid;
import jakarta.ws.rs.Consumes;
import jakarta.ws.rs.ForbiddenException;
import jakarta.ws.rs.GET;
import jakarta.ws.rs.HeaderParam;
import jakarta.ws.rs.NotFoundException;
import jakarta.ws.rs.POST;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.PathParam;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.core.MediaType;
import org.eclipse.microprofile.config.inject.ConfigProperty;
import org.eclipse.microprofile.jwt.JsonWebToken;

@Path("/")
@Consumes(MediaType.APPLICATION_JSON)
@Produces(MediaType.APPLICATION_JSON)
public class AccountabilityResource {

    private final AccountabilityService accountabilityService;
    private final ProfileIdResolver profileIdResolver;
    private final JsonWebToken jsonWebToken;
    private final boolean allowSimulatedAntiCheat;

    public AccountabilityResource(AccountabilityService accountabilityService,
                                 ProfileIdResolver profileIdResolver,
                                 JsonWebToken jsonWebToken,
                                 @ConfigProperty(name = "accountability.demo.allow-simulated-anti-cheat",
                                         defaultValue = "false") boolean allowSimulatedAntiCheat) {
        this.accountabilityService = accountabilityService;
        this.profileIdResolver = profileIdResolver;
        this.jsonWebToken = jsonWebToken;
        this.allowSimulatedAntiCheat = allowSimulatedAntiCheat;
    }

    @POST
    @Path("/samples")
    public ResultView submitSample(@HeaderParam("X-Profile-Id") String headerProfileId, @Valid SampleSubmission submission) {
        // Identity comes from the JWT sub in production; X-Profile-Id is a dev/test-only fallback
        // (see ProfileIdResolver + accountability.auth.allow-header-fallback).
        return accountabilityService.submitSample(profileIdResolver.resolve(headerProfileId), submission);
    }

    @POST
    @Path("/ban-notifications")
    @RolesAllowed({"operator", "service"})
    public BanNotificationResponse ingestBanNotification(@Valid BanNotificationRequest request) {
        if (jsonWebToken.getGroups().contains("operator")) {
            String operatorId = jsonWebToken.getClaim("operatorId");
            if (operatorId == null || !operatorId.equals(request.operatorId())) {
                throw new ForbiddenException("Operator token does not match request operatorId");
            }
        }
        return accountabilityService.ingestBanNotification(request);
    }

    /**
     * Inbound anti-cheat hook (Anti-Cheat-Integration.md / Contract 3b). A third-party anti-cheat
     * vendor (or the operator relaying it) pushes a verdict here. Detection happens externally;
     * the platform ingests it as an auto-confirmed, appealable, fully-audited accountability signal.
     * Authenticated per vendor — the demo trusts the simulated vendor via the {@code service} role.
     */
    @POST
    @Path("/anti-cheat-verdicts")
    @RolesAllowed({"anticheat", "operator", "service"})
    public AntiCheatVerdictResponse ingestAntiCheatVerdict(@Valid AntiCheatVerdictRequest request) {
        if (jsonWebToken.getGroups().contains("operator")) {
            String operatorId = jsonWebToken.getClaim("operatorId");
            if (operatorId == null || !operatorId.equals(request.operatorId())) {
                throw new ForbiddenException("Operator token does not match request operatorId");
            }
        }
        return accountabilityService.ingestAntiCheatVerdict(request);
    }

    @GET
    @Path("/results/{connectionId}")
    public ResultView getResult(@HeaderParam("X-Profile-Id") String headerProfileId,
                                @PathParam("connectionId") String connectionId) {
        return accountabilityService.getResult(profileIdResolver.resolve(headerProfileId), connectionId);
    }

    /**
     * Dev/test demo hook: triggers the in-module simulated anti-cheat vendor so the portal can show an
     * external cheat verdict landing as a confirmed, audited case that drops global trust. Runs against
     * the signed-in player's own profile (also usable by vendor/service roles). Gated by
     * {@code accountability.demo.allow-simulated-anti-cheat} — returns 404 in production, where real
     * verdicts arrive at {@code /anti-cheat-verdicts} from an authenticated vendor instead.
     */
    @POST
    @Path("/dev/anti-cheat-verdicts/simulate")
    @RolesAllowed({"player", "anticheat", "operator", "service"})
    public ResultView simulateAntiCheatVerdict(@HeaderParam("X-Profile-Id") String headerProfileId,
                                               SimulateAntiCheatRequest request) {
        if (!allowSimulatedAntiCheat) {
            throw new NotFoundException();
        }
        return accountabilityService.simulateAntiCheatVerdict(
                profileIdResolver.resolve(headerProfileId), request);
    }
}

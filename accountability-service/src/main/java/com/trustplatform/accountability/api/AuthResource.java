package com.trustplatform.accountability.api;

import com.trustplatform.accountability.dto.AuthRequest;
import com.trustplatform.accountability.dto.AuthResponse;
import com.trustplatform.accountability.dto.RegisterRequest;
import com.trustplatform.accountability.service.AuthService;
import jakarta.validation.Valid;
import jakarta.ws.rs.Consumes;
import jakarta.ws.rs.POST;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.core.MediaType;

/**
 * Login endpoint (Contract 0). Public by design — it is the entry point that mints the
 * JWT every other endpoint requires. Returns 401 for bad credentials.
 */
@Path("/auth")
@Consumes(MediaType.APPLICATION_JSON)
@Produces(MediaType.APPLICATION_JSON)
public class AuthResource {

    private final AuthService authService;

    public AuthResource(AuthService authService) {
        this.authService = authService;
    }

    @POST
    public AuthResponse authenticate(@Valid AuthRequest request) {
        return authService.authenticate(request);
    }

    /**
     * Self-service account creation (prototype/dev only). Creates a new player credential and
     * returns a JWT so the caller is signed in immediately. Gated by
     * {@code accountability.auth.allow-self-register}; returns 403 when disabled and 409 when the
     * email is already registered.
     */
    @POST
    @Path("/register")
    public AuthResponse register(@Valid RegisterRequest request) {
        return authService.register(request);
    }
}


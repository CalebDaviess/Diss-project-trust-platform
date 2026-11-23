package com.trustplatform.accountability.service;

import jakarta.enterprise.context.ApplicationScoped;
import jakarta.ws.rs.NotAuthorizedException;
import org.eclipse.microprofile.config.inject.ConfigProperty;
import org.eclipse.microprofile.jwt.JsonWebToken;

/**
 * Resolves the caller's platform identity ({@code profileId}).
 *
 * <p><strong>Production path:</strong> the verified JWT {@code sub}. This always takes priority.
 *
 * <p><strong>Dev/test only:</strong> when {@code accountability.auth.allow-header-fallback} is
 * true, an {@code X-Profile-Id} header is accepted if no JWT is present. This flag is false by
 * default, so production is JWT-only and a header cannot be used to impersonate a profile.
 */
@ApplicationScoped
public class ProfileIdResolver {

    private final JsonWebToken jsonWebToken;
    private final boolean allowHeaderFallback;

    public ProfileIdResolver(
            JsonWebToken jsonWebToken,
            @ConfigProperty(name = "accountability.auth.allow-header-fallback", defaultValue = "false")
            boolean allowHeaderFallback) {
        this.jsonWebToken = jsonWebToken;
        this.allowHeaderFallback = allowHeaderFallback;
    }

    public String resolve(String headerProfileId) {
        String subject = jsonWebToken == null ? null : jsonWebToken.getSubject();
        if (subject != null && !subject.isBlank()) {
            return subject;
        }
        if (allowHeaderFallback && headerProfileId != null && !headerProfileId.isBlank()) {
            return headerProfileId.trim();
        }
        throw new NotAuthorizedException("A verified JWT is required");
    }
}

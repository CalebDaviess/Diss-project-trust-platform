package com.trustplatform.accountability.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/**
 * Self-service account creation request for POST /register.
 *
 * <p>Prototype-only convenience: in the real product a credential is minted after identity
 * verification (designed, not built), so this endpoint is gated to dev/test by
 * {@code accountability.auth.allow-self-register}. The raw password is hashed then discarded.
 *
 * <p>Age assurance: the player self-declares whether they are 18 or over ({@code over18}). The
 * portal's mocked ID check reads the age off the document and only submits here once it is
 * consistent. For an under-18 account the request also carries the child's name and a verified
 * adult {@code guardian} who vouches for them, plus whether the guardian allows 18+ rated games.
 *
 * @param username the login email. For a guardian-controlled account this is the guardian's email.
 * @param password the raw password (min 8 chars), hashed with bcrypt before storage
 * @param idType   the claimed identity-document type. Captured for the UI's mock step only.
 * @param over18   self-declared 18-or-over. Null is treated as true (back-compat with older clients).
 * @param holderName the account holder's name (the child's name, for a guardian account)
 * @param guardian  the vouching adult guardian; required when {@code over18} is false
 * @param allowMatureGames guardian's consent for the minor to reach 18+ rated games
 */
public record RegisterRequest(
        @NotBlank @Email String username,
        @NotBlank @Size(min = 8, message = "Password must be at least 8 characters") String password,
        String idType,
        Boolean over18,
        String holderName,
        @Valid Guardian guardian,
        Boolean allowMatureGames
) {

    /** Back-compat constructor for the basic (adult) registration shape. */
    public RegisterRequest(String username, String password, String idType) {
        this(username, password, idType, null, null, null, null);
    }

    /** True when the account is for an under-18 and must be guardian-controlled. */
    public boolean isMinor() {
        return over18 != null && !over18;
    }

    /** A verified adult who vouches for an under-18 account holder. */
    public record Guardian(
            @NotBlank String name,
            @NotBlank @Email String email,
            String idType
    ) {
    }
}

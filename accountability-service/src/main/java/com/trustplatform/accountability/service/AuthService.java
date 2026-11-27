package com.trustplatform.accountability.service;

import com.trustplatform.accountability.dto.AuthRequest;
import com.trustplatform.accountability.dto.AuthResponse;
import com.trustplatform.accountability.dto.RegisterRequest;
import com.trustplatform.accountability.entity.PlayerProfile;
import com.trustplatform.accountability.entity.UserCredential;
import com.trustplatform.accountability.repository.PlayerProfileRepository;
import com.trustplatform.accountability.repository.UserCredentialRepository;
import io.smallrye.jwt.build.Jwt;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.transaction.Transactional;
import jakarta.ws.rs.ForbiddenException;
import jakarta.ws.rs.NotAuthorizedException;
import jakarta.ws.rs.WebApplicationException;
import jakarta.ws.rs.core.Response;
import org.eclipse.microprofile.config.inject.ConfigProperty;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.Duration;
import java.util.Arrays;
import java.util.HexFormat;
import java.util.Set;
import java.util.stream.Collectors;

/**
 * Authenticates a username/password against the credential store and issues a stateless
 * RS256 JWT (Contract 0). The token's {@code sub} is the hashed profile id; {@code iss} is
 * the configured issuer. Raw credentials are verified then discarded — never logged or stored.
 */
@ApplicationScoped
public class AuthService {

    /** Token lifetime. Kept short; there is no refresh flow in this slice. */
    static final Duration TOKEN_TTL = Duration.ofHours(1);

    private final UserCredentialRepository userCredentialRepository;
    private final PlayerProfileRepository playerProfileRepository;
    private final PasswordHasher passwordHasher;
    private final String issuer;
    private final boolean allowSelfRegister;

    public AuthService(
            UserCredentialRepository userCredentialRepository,
            PlayerProfileRepository playerProfileRepository,
            PasswordHasher passwordHasher,
            @ConfigProperty(name = "mp.jwt.verify.issuer") String issuer,
            @ConfigProperty(name = "accountability.auth.allow-self-register", defaultValue = "false")
            boolean allowSelfRegister) {
        this.userCredentialRepository = userCredentialRepository;
        this.playerProfileRepository = playerProfileRepository;
        this.passwordHasher = passwordHasher;
        this.issuer = issuer;
        this.allowSelfRegister = allowSelfRegister;
    }

    /**
     * Verify credentials and mint a JWT.
     *
     * @throws NotAuthorizedException if the user is unknown or the password does not match.
     *         The same error is returned for both cases so callers cannot probe valid usernames.
     */
    @Transactional
    public AuthResponse authenticate(AuthRequest request) {
        String username = request.username().trim().toLowerCase();
        UserCredential credential = userCredentialRepository.findById(username);
        if (credential == null || !passwordHasher.matches(request.password(), credential.passwordHash)) {
            throw new NotAuthorizedException("Invalid username or password");
        }
        return mintToken(credential);
    }

    /**
     * Self-service account creation (prototype only). Creates a new {@code player} credential,
     * derives its hashed {@code profileId} from the username, and returns a JWT so the caller is
     * signed in immediately. A new account starts with an empty record and the default trust score.
     *
     * @throws ForbiddenException    if self-registration is disabled (production default).
     * @throws WebApplicationException 409 Conflict if the username is already taken.
     */
    @Transactional
    public AuthResponse register(RegisterRequest request) {
        if (!allowSelfRegister) {
            throw new ForbiddenException("Self-registration is disabled");
        }
        String username = request.username().trim().toLowerCase();
        if (userCredentialRepository.findById(username) != null) {
            throw new WebApplicationException("An account with this email already exists",
                    Response.Status.CONFLICT);
        }
        if (request.isMinor() && request.guardian() == null) {
            throw new WebApplicationException(
                    "An under-18 account needs a verified adult guardian", Response.Status.BAD_REQUEST);
        }

        UserCredential credential = new UserCredential();
        credential.username = username;
        credential.profileId = deriveProfileId(username);
        credential.passwordHash = passwordHasher.hash(request.password());
        credential.roles = "player";
        userCredentialRepository.persist(credential);

        // Create the identity profile up-front so the account's type (adult vs guardian-controlled),
        // guardian details and 18+ access are known from first sign-in. created_at is DB-defaulted,
        // so this also anchors the trust-over-time graph at registration.
        PlayerProfile profile = new PlayerProfile();
        profile.profileId = credential.profileId;
        profile.globalTrustScore = PlayerProfile.DEFAULT_GLOBAL_TRUST_SCORE;
        if (request.isMinor()) {
            profile.accountType = PlayerProfile.ACCOUNT_GUARDIAN_MINOR;
            profile.holderName = blankToNull(request.holderName());
            profile.guardianName = request.guardian().name().trim();
            profile.guardianEmail = request.guardian().email().trim().toLowerCase();
            profile.matureAccessAllowed = Boolean.TRUE.equals(request.allowMatureGames());
        } else {
            profile.accountType = PlayerProfile.ACCOUNT_ADULT;
            profile.holderName = blankToNull(request.holderName());
            profile.matureAccessAllowed = true;
        }
        playerProfileRepository.persist(profile);

        return mintToken(credential);
    }

    private static String blankToNull(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }

    /** Mint a stateless RS256 JWT carrying the credential's profile id (sub) and roles (groups). */
    private AuthResponse mintToken(UserCredential credential) {
        Set<String> roles = Arrays.stream(credential.roles.split(","))
                .map(String::trim)
                .filter(role -> !role.isEmpty())
                .collect(Collectors.toSet());

        String token = Jwt.issuer(issuer)
                .subject(credential.profileId)
                .groups(roles)
                .expiresIn(TOKEN_TTL)
                .sign();

        return new AuthResponse(token, "Bearer", TOKEN_TTL.toSeconds());
    }

    /**
     * Derive the platform identity ({@code profileId}) as {@code sha256:<hex>} of the username.
     * The real product derives this from verified identity; here a deterministic hash keeps the
     * account's identity stable and non-reversible without storing the raw email as the key.
     */
    private static String deriveProfileId(String username) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hash = digest.digest(username.getBytes(StandardCharsets.UTF_8));
            return "sha256:" + HexFormat.of().formatHex(hash);
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException("SHA-256 is required but unavailable", e);
        }
    }
}




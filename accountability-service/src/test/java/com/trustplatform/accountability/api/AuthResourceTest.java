package com.trustplatform.accountability.api;

import com.trustplatform.accountability.dto.AuthRequest;
import com.trustplatform.accountability.dto.RegisterRequest;
import com.trustplatform.accountability.entity.GameConnection;
import com.trustplatform.accountability.entity.PlayerProfile;
import com.trustplatform.accountability.repository.GameConnectionRepository;
import com.trustplatform.accountability.repository.PlayerProfileRepository;
import com.trustplatform.accountability.service.DemoUserSeeder;
import io.quarkus.narayana.jta.QuarkusTransaction;
import io.quarkus.test.junit.QuarkusTest;
import io.restassured.http.ContentType;
import org.junit.jupiter.api.Test;

import static io.restassured.RestAssured.given;
import static org.hamcrest.Matchers.greaterThan;
import static org.hamcrest.Matchers.is;
import static org.hamcrest.Matchers.notNullValue;

@QuarkusTest
class AuthResourceTest {

    @jakarta.inject.Inject
    PlayerProfileRepository playerProfileRepository;

    @jakarta.inject.Inject
    GameConnectionRepository gameConnectionRepository;

    @Test
    void loginWithValidCredentialsReturnsBearerToken() {
        given()
                .contentType(ContentType.JSON)
                .body(new AuthRequest(DemoUserSeeder.DEMO_USERNAME, DemoUserSeeder.DEMO_PASSWORD))
                .when().post("/auth")
                .then()
                .statusCode(200)
                .body("token", notNullValue())
                .body("tokenType", is("Bearer"))
                .body("expiresIn", greaterThan(0));
    }

    @Test
    void loginIsCaseInsensitiveAndTrimsEmail() {
        given()
                .contentType(ContentType.JSON)
                .body(new AuthRequest("  PLAYER@Example.COM ", DemoUserSeeder.DEMO_PASSWORD))
                .when().post("/auth")
                .then()
                .statusCode(200)
                .body("token", notNullValue())
                .body("tokenType", is("Bearer"));
    }

    @Test
    void loginWithWrongPasswordIsUnauthorized() {
        given()
                .contentType(ContentType.JSON)
                .body(new AuthRequest(DemoUserSeeder.DEMO_USERNAME, "not-the-password"))
                .when().post("/auth")
                .then()
                .statusCode(401);
    }

    @Test
    void loginWithUnknownUserIsUnauthorized() {
        given()
                .contentType(ContentType.JSON)
                .body(new AuthRequest("nobody@example.com", "whatever"))
                .when().post("/auth")
                .then()
                .statusCode(401);
    }

    @Test
    void jwtSubjectResolvesIdentityOnAuthenticatedRequest() {
        // Seed a profile for the demo login's hashed profile id with a distinctive trust score.
        QuarkusTransaction.requiringNew().run(() -> {
            PlayerProfile profile = playerProfileRepository.findById(DemoUserSeeder.DEMO_PROFILE_ID);
            if (profile == null) {
                profile = new PlayerProfile();
                profile.profileId = DemoUserSeeder.DEMO_PROFILE_ID;
                playerProfileRepository.persist(profile);
            }
            profile.globalTrustScore = 42;

            if (gameConnectionRepository.findById("gc-jwt") == null) {
                GameConnection connection = new GameConnection();
                connection.connectionId = "gc-jwt";
                connection.profile = profile;
                connection.operatorId = "op-1";
                connection.gameId = "game-a";
                gameConnectionRepository.persist(connection);
            }
        });

        String token = login();

        // Send ONLY the Bearer token (no X-Profile-Id). The JWT sub must resolve the identity.
        given()
                .header("Authorization", "Bearer " + token)
                .when().get("/results/gc-jwt")
                .then()
                .statusCode(200)
                .body("gameConnectionId", is("gc-jwt"))
                .body("globalTrustScore", is(42));
    }

    @Test
    void jwtSubjectTakesPriorityOverProfileHeader() {
        String token = login();

        // Conflicting X-Profile-Id must be ignored: the JWT sub (demo-player) wins.
        given()
                .header("Authorization", "Bearer " + token)
                .header("X-Profile-Id", "sha256:someone-else")
                .when().get("/results/gc-unknown-for-demo")
                .then()
                .statusCode(200)
                .body("gameConnectionId", is("gc-unknown-for-demo"))
                // No record for this connection under demo-player → default trust, no case history.
                .body("conductScore", org.hamcrest.Matchers.nullValue());
    }

    @Test
    void registerCreatesAccountThatCanLogInAndResolveIdentity() {
        String email = "newbie-" + java.util.UUID.randomUUID() + "@example.com";

        // Register returns a usable bearer token (auto sign-in).
        String registerToken = given()
                .contentType(ContentType.JSON)
                .body(new RegisterRequest(email, "super-secret", "passport"))
                .when().post("/auth/register")
                .then()
                .statusCode(200)
                .body("token", notNullValue())
                .body("tokenType", is("Bearer"))
                .extract().path("token");

        // The brand-new account has an empty record and the default trust score.
        given()
                .header("Authorization", "Bearer " + registerToken)
                .when().get("/results/gc-fresh-account")
                .then()
                .statusCode(200)
                .body("globalTrustScore", is(100))
                .body("conductScore", org.hamcrest.Matchers.nullValue());

        // The same credentials now work through the normal login endpoint.
        given()
                .contentType(ContentType.JSON)
                .body(new AuthRequest(email, "super-secret"))
                .when().post("/auth")
                .then()
                .statusCode(200)
                .body("token", notNullValue());
    }

    @Test
    void registerWithExistingEmailIsConflict() {
        given()
                .contentType(ContentType.JSON)
                .body(new RegisterRequest(DemoUserSeeder.DEMO_USERNAME, "another-password", "drivers-licence"))
                .when().post("/auth/register")
                .then()
                .statusCode(409);
    }

    @Test
    void registerWithShortPasswordIsBadRequest() {
        given()
                .contentType(ContentType.JSON)
                .body(new RegisterRequest("shortpw-" + java.util.UUID.randomUUID() + "@example.com", "short", "passport"))
                .when().post("/auth/register")
                .then()
                .statusCode(400);
    }

    @Test
    void registerMinorCreatesGuardianControlledAccountThatCanComeOfAge() {
        String guardianEmail = "parent-" + java.util.UUID.randomUUID() + "@example.com";
        var guardian = new RegisterRequest.Guardian("Parent Name", guardianEmail, "passport");

        String token = given()
                .contentType(ContentType.JSON)
                .body(new RegisterRequest(guardianEmail, "super-secret", "passport",
                        false, "Kiddo", guardian, false))
                .when().post("/auth/register")
                .then()
                .statusCode(200)
                .extract().path("token");

        // The profile overview reports a guardian-controlled account with 18+ access withheld.
        given()
                .header("Authorization", "Bearer " + token)
                .when().get("/profile")
                .then()
                .statusCode(200)
                .body("accountType", is("GUARDIAN_MINOR"))
                .body("guardianControlled", is(true))
                .body("holderName", is("Kiddo"))
                .body("guardianName", is("Parent Name"))
                .body("matureAccessAllowed", is(false));

        // Turning 18 + verifying own ID converts to a full adult account with full access.
        given()
                .header("Authorization", "Bearer " + token)
                .when().post("/profile/verify-adult")
                .then()
                .statusCode(200)
                .body("accountType", is("ADULT"))
                .body("guardianControlled", is(false))
                .body("matureAccessAllowed", is(true))
                .body("guardianName", org.hamcrest.Matchers.nullValue());
    }

    @Test
    void registerMinorWithoutGuardianIsBadRequest() {
        String email = "lonely-minor-" + java.util.UUID.randomUUID() + "@example.com";
        given()
                .contentType(ContentType.JSON)
                .body(new RegisterRequest(email, "super-secret", "passport", false, "Kiddo", null, false))
                .when().post("/auth/register")
                .then()
                .statusCode(400);
    }

    @Test
    void adultProfileOverviewDefaultsToFullAccess() {
        String email = "adult-" + java.util.UUID.randomUUID() + "@example.com";
        String token = given()
                .contentType(ContentType.JSON)
                .body(new RegisterRequest(email, "super-secret", "passport", true, null, null, null))
                .when().post("/auth/register")
                .then()
                .statusCode(200)
                .extract().path("token");

        given()
                .header("Authorization", "Bearer " + token)
                .when().get("/profile")
                .then()
                .statusCode(200)
                .body("accountType", is("ADULT"))
                .body("guardianControlled", is(false))
                .body("matureAccessAllowed", is(true));
    }

    private String login() {
        return given()
                .contentType(ContentType.JSON)
                .body(new AuthRequest(DemoUserSeeder.DEMO_USERNAME, DemoUserSeeder.DEMO_PASSWORD))
                .when().post("/auth")
                .then()
                .statusCode(200)
                .extract().path("token");
    }
}


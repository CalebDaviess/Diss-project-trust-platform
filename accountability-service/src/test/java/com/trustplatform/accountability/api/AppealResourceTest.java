package com.trustplatform.accountability.api;

import com.trustplatform.accountability.dto.AuthRequest;
import com.trustplatform.accountability.dto.CreateConnectionRequest;
import com.trustplatform.accountability.dto.ResolveAppealRequest;
import com.trustplatform.accountability.dto.SimulateAntiCheatRequest;
import com.trustplatform.accountability.dto.SimulateBanRequest;
import com.trustplatform.accountability.dto.SubmitAppealRequest;
import com.trustplatform.accountability.service.DemoUserSeeder;
import io.quarkus.test.junit.QuarkusTest;
import io.restassured.http.ContentType;
import org.junit.jupiter.api.Test;

import java.util.UUID;

import static io.restassured.RestAssured.given;
import static org.hamcrest.Matchers.emptyString;
import static org.hamcrest.Matchers.greaterThanOrEqualTo;
import static org.hamcrest.Matchers.is;
import static org.hamcrest.Matchers.not;
import static org.hamcrest.Matchers.notNullValue;

@QuarkusTest
class AppealResourceTest {

    @Test
    void submitAppealMovesSanctionToAppealedThenOverturnOnApprove() {
        String token = login();
        String gameId = "gid-" + UUID.randomUUID();
        String connectionId = linkGame(token, gameId);

        // Land a confirmed anti-cheat verdict (drops trust) so there is a sanction to appeal.
        int scoreAfterSanction = given()
                .header("Authorization", "Bearer " + token)
                .contentType(ContentType.JSON)
                .body(new SimulateAntiCheatRequest(connectionId, "op-steam", gameId))
                .when().post("/dev/anti-cheat-verdicts/simulate")
                .then()
                .statusCode(200)
                .body("status", is("confirmed"))
                .extract().path("globalTrustScore");

        // The sanction is now appealable.
        given()
                .header("Authorization", "Bearer " + token)
                .when().get("/appeals")
                .then()
                .statusCode(200)
                .body("appealable.findAll { it.connectionId == '" + connectionId + "' }.size()", is(1));

        // Submit an appeal.
        String appealId = given()
                .header("Authorization", "Bearer " + token)
                .contentType(ContentType.JSON)
                .body(new SubmitAppealRequest(connectionId, "not-me", "This was not me — account was shared.", 2))
                .when().post("/appeals")
                .then()
                .statusCode(200)
                .body("status", is("submitted"))
                .body("appealId", notNullValue())
                .extract().path("appealId");

        // Record is now "under review".
        resultStatus(token, connectionId, "appealed");

        // Approve it → sanction overturned and trust restored.
        given()
                .header("Authorization", "Bearer " + token)
                .contentType(ContentType.JSON)
                .body(new ResolveAppealRequest("approved", "Verified — overturning."))
                .when().post("/appeals/" + appealId + "/resolve")
                .then()
                .statusCode(200)
                .body("status", is("approved"));

        resultStatus(token, connectionId, "overturned");

        // Trust is restored (>= the post-sanction score).
        given()
                .header("Authorization", "Bearer " + token)
                .when().get("/results/" + connectionId)
                .then()
                .statusCode(200)
                .body("globalTrustScore", greaterThanOrEqualTo(scoreAfterSanction));
    }

    @Test
    void deniedAppealIsFinalCannotBeReappealedAndCarriesAReviewerComment() {
        String token = login();
        String gameId = "gid-" + UUID.randomUUID();
        String connectionId = linkGame(token, gameId);

        given()
                .header("Authorization", "Bearer " + token)
                .contentType(ContentType.JSON)
                .body(new SimulateAntiCheatRequest(connectionId, "op-steam", gameId))
                .when().post("/dev/anti-cheat-verdicts/simulate")
                .then().statusCode(200);

        String appealId = given()
                .header("Authorization", "Bearer " + token)
                .contentType(ContentType.JSON)
                .body(new SubmitAppealRequest(connectionId, "not-me", "It was not me.", 1))
                .when().post("/appeals")
                .then().statusCode(200)
                .extract().path("appealId");

        // Deny with no note → the demo fills a representative reviewer comment.
        given()
                .header("Authorization", "Bearer " + token)
                .contentType(ContentType.JSON)
                .body(new ResolveAppealRequest("denied", null))
                .when().post("/appeals/" + appealId + "/resolve")
                .then().statusCode(200)
                .body("status", is("denied"))
                .body("decisionNote", notNullValue())
                .body("decisionNote", not(emptyString()));

        // The upheld sanction is final: it is no longer open to appeal...
        given()
                .header("Authorization", "Bearer " + token)
                .when().get("/appeals")
                .then().statusCode(200)
                .body("appealable.findAll { it.connectionId == '" + connectionId + "' }.size()", is(0));

        // ...and a second appeal is rejected.
        given()
                .header("Authorization", "Bearer " + token)
                .contentType(ContentType.JSON)
                .body(new SubmitAppealRequest(connectionId, "not-me", "Please look again.", 0))
                .when().post("/appeals")
                .then().statusCode(409);
    }

    @Test
    void appealOnConnectionWithoutConfirmedSanctionIsBadRequest() {
        String token = login();
        String connectionId = linkGame(token, "gid-" + UUID.randomUUID());
        given()
                .header("Authorization", "Bearer " + token)
                .contentType(ContentType.JSON)
                .body(new SubmitAppealRequest(connectionId, "mistake", "Nothing to appeal yet.", 0))
                .when().post("/appeals")
                .then()
                .statusCode(400);
    }

    @Test
    void approvingAppealLiftsActiveBanAndRestoresTrust() {
        String token = login();
        String gameId = "gid-" + UUID.randomUUID();
        String connectionId = linkGame(token, gameId);

        given()
                .header("Authorization", "Bearer " + token)
                .contentType(ContentType.JSON)
                .body(new SimulateBanRequest(connectionId, "temporary", 14, true))
                .when().post("/dev/bans/simulate")
                .then()
                .statusCode(200)
                .body("status", is("confirmed"));

        // Active ban is visible before appeal approval.
        given()
                .header("Authorization", "Bearer " + token)
                .when().get("/bans")
                .then()
                .statusCode(200)
                .body("findAll { it.connectionId == '" + connectionId + "' }.size()", is(1));

        String appealId = given()
                .header("Authorization", "Bearer " + token)
                .contentType(ContentType.JSON)
                .body(new SubmitAppealRequest(connectionId, "wrong-call", "False positive suspension — please review logs.", 1))
                .when().post("/appeals")
                .then()
                .statusCode(200)
                .extract().path("appealId");

        given()
                .header("Authorization", "Bearer " + token)
                .contentType(ContentType.JSON)
                .body(new ResolveAppealRequest("approved", "Overturned on review."))
                .when().post("/appeals/" + appealId + "/resolve")
                .then()
                .statusCode(200)
                .body("status", is("approved"));

        resultStatus(token, connectionId, "overturned");

        // Active ban must now be lifted from GET /bans.
        given()
                .header("Authorization", "Bearer " + token)
                .when().get("/bans")
                .then()
                .statusCode(200)
                .body("findAll { it.connectionId == '" + connectionId + "' }.size()", is(0));
    }

    @Test
    void appealsRequireAuth() {
        given().when().get("/appeals").then().statusCode(401);
    }

    private void resultStatus(String token, String connectionId, String expected) {
        given()
                .header("Authorization", "Bearer " + token)
                .when().get("/results/" + connectionId)
                .then().statusCode(200)
                .body("status", is(expected));
    }

    private String linkGame(String token, String gameId) {
        return given()
                .header("Authorization", "Bearer " + token)
                .contentType(ContentType.JSON)
                .body(new CreateConnectionRequest(gameId, "Test Game", "steam", "op-steam", "ref", null))
                .when().post("/connections")
                .then().statusCode(200)
                .extract().path("connectionId");
    }

    private String login() {
        return given()
                .contentType(ContentType.JSON)
                .body(new AuthRequest(DemoUserSeeder.DEMO_USERNAME, DemoUserSeeder.DEMO_PASSWORD))
                .when().post("/auth")
                .then().statusCode(200)
                .extract().path("token");
    }
}

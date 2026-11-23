package com.trustplatform.accountability.api;

import com.trustplatform.accountability.dto.AuthRequest;
import com.trustplatform.accountability.dto.CreateConnectionRequest;
import com.trustplatform.accountability.dto.SimulateBanRequest;
import com.trustplatform.accountability.dto.SubmitAppealRequest;
import com.trustplatform.accountability.service.DemoUserSeeder;
import io.quarkus.test.junit.QuarkusTest;
import io.restassured.http.ContentType;
import org.junit.jupiter.api.Test;

import java.util.UUID;

import static io.restassured.RestAssured.given;
import static org.hamcrest.Matchers.greaterThanOrEqualTo;
import static org.hamcrest.Matchers.is;
import static org.hamcrest.Matchers.notNullValue;

@QuarkusTest
class BanResourceTest {

    @Test
    void simulatedBanAppearsInBansWithTypeDurationAndKeepsGameLinked() {
        String token = login();
        String gameId = "gid-" + UUID.randomUUID();
        String connectionId = linkGame(token, gameId);

        given()
                .header("Authorization", "Bearer " + token)
                .contentType(ContentType.JSON)
                .body(new SimulateBanRequest(connectionId, "communication", 7, true))
                .when().post("/dev/bans/simulate")
                .then().statusCode(200)
                // The game stays linked even though it's banned, and the ban is counted.
                .body("linkedGamesCount", greaterThanOrEqualTo(1))
                .body("activeBanCount", greaterThanOrEqualTo(1));

        given()
                .header("Authorization", "Bearer " + token)
                .when().get("/bans")
                .then().statusCode(200)
                .body("find { it.connectionId == '" + connectionId + "' }.banType", is("communication"))
                .body("find { it.connectionId == '" + connectionId + "' }.appealable", is(true))
                .body("find { it.connectionId == '" + connectionId + "' }.expiresAt", notNullValue());
    }

    @Test
    void nonAppealableBanIsNotAppealable() {
        String token = login();
        String connectionId = linkGame(token, "gid-" + UUID.randomUUID());

        given()
                .header("Authorization", "Bearer " + token)
                .contentType(ContentType.JSON)
                .body(new SimulateBanRequest(connectionId, "permanent", null, false))
                .when().post("/dev/bans/simulate")
                .then().statusCode(200);

        // Not listed as open-to-appeal.
        given()
                .header("Authorization", "Bearer " + token)
                .when().get("/appeals")
                .then().statusCode(200)
                .body("appealable.findAll { it.connectionId == '" + connectionId + "' }.size()", is(0));

        // Submitting an appeal is rejected.
        given()
                .header("Authorization", "Bearer " + token)
                .contentType(ContentType.JSON)
                .body(new SubmitAppealRequest(connectionId, "mistake", "Please review this permanent ban.", 0))
                .when().post("/appeals")
                .then().statusCode(400);
    }

    @Test
    void linkedGamesCountCountsConnectionsNotOffences() {
        String token = login();
        linkGame(token, "gid-" + UUID.randomUUID());
        String second = linkGame(token, "gid-" + UUID.randomUUID());

        given()
                .header("Authorization", "Bearer " + token)
                .when().get("/results/" + second)
                .then().statusCode(200)
                .body("linkedGamesCount", greaterThanOrEqualTo(2));
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

    @Test
    void operatorBanIsRecordedAsAConfirmedOffence() {
        String token = login();
        String gameId = "gid-" + UUID.randomUUID();
        String connectionId = linkGame(token, gameId);

        // A direct operator ban with no prior conduct case must still register a confirmed offence.
        given()
                .header("Authorization", "Bearer " + token)
                .contentType(ContentType.JSON)
                .body(new SimulateBanRequest(connectionId, "communication", 7, true))
                .when().post("/dev/bans/simulate")
                .then().statusCode(200);

        given()
                .header("Authorization", "Bearer " + token)
                .when().get("/results/" + connectionId)
                .then().statusCode(200)
                .body("status", is("confirmed"))
                .body("caseHistory.findAll { it.status == 'confirmed' }.size()", greaterThanOrEqualTo(1))
                .body("caseHistory.find { it.status == 'confirmed' }.offenceType", is("chatAbuse"));
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

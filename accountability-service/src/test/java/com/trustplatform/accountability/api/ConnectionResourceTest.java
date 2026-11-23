package com.trustplatform.accountability.api;

import com.trustplatform.accountability.dto.AuthRequest;
import com.trustplatform.accountability.dto.CreateConnectionRequest;
import com.trustplatform.accountability.service.DemoUserSeeder;
import io.quarkus.test.junit.QuarkusTest;
import io.restassured.http.ContentType;
import org.junit.jupiter.api.Test;

import static io.restassured.RestAssured.given;
import static org.hamcrest.Matchers.hasItem;
import static org.hamcrest.Matchers.is;
import static org.hamcrest.Matchers.notNullValue;

@QuarkusTest
class ConnectionResourceTest {

    @Test
    void linkListAndUnlinkAGame() {
        String token = login();

        String connectionId = given()
                .header("Authorization", "Bearer " + token)
                .contentType(ContentType.JSON)
                .body(new CreateConnectionRequest("2357570", "Overwatch", "steam", "op-steam", "Player#1234", "https://img/ow.jpg"))
                .when().post("/connections")
                .then()
                .statusCode(200)
                .body("connectionId", notNullValue())
                .body("gameName", is("Overwatch"))
                .body("provider", is("steam"))
                .body("status", is("active"))
                .extract().path("connectionId");

        // It appears in the player's connection list.
        given()
                .header("Authorization", "Bearer " + token)
                .when().get("/connections")
                .then()
                .statusCode(200)
                .body("connectionId", hasItem(connectionId));

        // Unlink it.
        given()
                .header("Authorization", "Bearer " + token)
                .when().delete("/connections/" + connectionId)
                .then()
                .statusCode(204);

        // It is no longer listed.
        given()
                .header("Authorization", "Bearer " + token)
                .when().get("/connections")
                .then()
                .statusCode(200)
                .body("findAll { it.connectionId == '" + connectionId + "' }.size()", is(0));
    }

    @Test
    void relinkingSameGameDoesNotDuplicate() {
        String token = login();
        var request = new CreateConnectionRequest("570", "Dota 2", "steam", "op-steam", "Player#9", null);

        given().header("Authorization", "Bearer " + token).contentType(ContentType.JSON).body(request)
                .when().post("/connections").then().statusCode(200);
        given().header("Authorization", "Bearer " + token).contentType(ContentType.JSON).body(request)
                .when().post("/connections").then().statusCode(200);

        given()
                .header("Authorization", "Bearer " + token)
                .when().get("/connections")
                .then()
                .statusCode(200)
                .body("findAll { it.gameId == '570' }.size()", is(1));
    }

    @Test
    void connectionsRequireAuth() {
        given().when().get("/connections").then().statusCode(401);
    }

    @Test
    void matureGameBlockedForGuardianMinorUntilConsentOrAdulthood() {
        // A guardian-controlled minor without 18+ consent.
        String minorEmail = "minor-" + java.util.UUID.randomUUID() + "@example.com";
        var guardian = new com.trustplatform.accountability.dto.RegisterRequest.Guardian(
                "Parent", "guardian-" + java.util.UUID.randomUUID() + "@example.com", "passport");
        String token = given()
                .contentType(ContentType.JSON)
                .body(new com.trustplatform.accountability.dto.RegisterRequest(
                        minorEmail, "super-secret", "passport", false, "Kid", guardian, false))
                .when().post("/auth/register").then().statusCode(200).extract().path("token");

        var matureGame = new CreateConnectionRequest("271590", "Grand Theft Auto V", "steam",
                "op-steam", "ref", null, true);

        // Linking an 18+ game is forbidden on this account.
        given().header("Authorization", "Bearer " + token).contentType(ContentType.JSON).body(matureGame)
                .when().post("/connections").then().statusCode(403);

        // After the holder turns 18 and verifies their own ID, the same link succeeds.
        given().header("Authorization", "Bearer " + token)
                .when().post("/profile/verify-adult").then().statusCode(200);
        given().header("Authorization", "Bearer " + token).contentType(ContentType.JSON).body(matureGame)
                .when().post("/connections").then().statusCode(200);
    }

    @Test
    void matureGameAllowedForGuardianMinorWithConsent() {
        String minorEmail = "minor-ok-" + java.util.UUID.randomUUID() + "@example.com";
        var guardian = new com.trustplatform.accountability.dto.RegisterRequest.Guardian(
                "Parent", "guardian-" + java.util.UUID.randomUUID() + "@example.com", "passport");
        String token = given()
                .contentType(ContentType.JSON)
                .body(new com.trustplatform.accountability.dto.RegisterRequest(
                        minorEmail, "super-secret", "passport", false, "Kid", guardian, true))
                .when().post("/auth/register").then().statusCode(200).extract().path("token");

        given().header("Authorization", "Bearer " + token).contentType(ContentType.JSON)
                .body(new CreateConnectionRequest("271590", "Grand Theft Auto V", "steam",
                        "op-steam", "ref", null, true))
                .when().post("/connections").then().statusCode(200);
    }

    @Test
    void gameSearchReturnsOkArray() {
        // Proxies the public Steam search; network-tolerant — just assert a 200 JSON array.
        given()
                .header("Authorization", "Bearer " + login())
                .when().get("/games/search?q=overwatch")
                .then()
                .statusCode(200)
                .contentType(ContentType.JSON);
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

package com.trustplatform.accountability.service;

import com.trustplatform.accountability.dto.AuthRequest;
import com.trustplatform.accountability.repository.AccountabilityRecordRepository;
import com.trustplatform.accountability.repository.AntiCheatVerdictRepository;
import com.trustplatform.accountability.repository.AppealRepository;
import com.trustplatform.accountability.repository.AuditEntryRepository;
import com.trustplatform.accountability.repository.CaseEventRepository;
import com.trustplatform.accountability.repository.ExternalBanRepository;
import com.trustplatform.accountability.repository.GameConnectionRepository;
import com.trustplatform.accountability.repository.PlayerProfileRepository;
import com.trustplatform.accountability.repository.TrustHistoryRepository;
import io.quarkus.narayana.jta.QuarkusTransaction;
import io.quarkus.test.junit.QuarkusTest;
import io.restassured.http.ContentType;
import jakarta.inject.Inject;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import static io.restassured.RestAssured.given;
import static org.hamcrest.Matchers.greaterThanOrEqualTo;
import static org.hamcrest.Matchers.hasSize;
import static org.hamcrest.Matchers.is;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

@QuarkusTest
class DemoHistorySeederTest {

    @Inject DemoHistorySeeder demoHistorySeeder;
    @Inject AppealRepository appealRepository;
    @Inject AuditEntryRepository auditEntryRepository;
    @Inject CaseEventRepository caseEventRepository;
    @Inject AccountabilityRecordRepository accountabilityRecordRepository;
    @Inject ExternalBanRepository externalBanRepository;
    @Inject AntiCheatVerdictRepository antiCheatVerdictRepository;
    @Inject GameConnectionRepository gameConnectionRepository;
    @Inject TrustHistoryRepository trustHistoryRepository;
    @Inject PlayerProfileRepository playerProfileRepository;

    @BeforeEach
    @AfterEach
    void clearDemoProfileState() {
        QuarkusTransaction.requiringNew().run(() -> {
            String pid = DemoUserSeeder.DEMO_PROFILE_ID;
            appealRepository.delete("profileId", pid);
            auditEntryRepository.delete("record.profileId", pid);
            caseEventRepository.delete("record.profileId", pid);
            accountabilityRecordRepository.delete("profileId", pid);
            externalBanRepository.delete("profileId", pid);
            antiCheatVerdictRepository.delete("profileId", pid);
            gameConnectionRepository.delete("profile.profileId", pid);
            trustHistoryRepository.delete("profileId", pid);
            playerProfileRepository.delete("profileId", pid);
        });
    }

    @Test
    void seedsTwoGamesCrossGameHistoryAndIsIdempotent() {
        assertTrue(demoHistorySeeder.seedDemoHistoryIfEmpty());
        // Second call must be a no-op so container restarts never duplicate demo data.
        assertFalse(demoHistorySeeder.seedDemoHistoryIfEmpty());

        String token = given()
                .contentType(ContentType.JSON)
                .body(new AuthRequest(DemoUserSeeder.DEMO_USERNAME, DemoUserSeeder.DEMO_PASSWORD))
                .when().post("/auth")
                .then()
                .statusCode(200)
                .extract().path("token");

        given()
                .header("Authorization", "Bearer " + token)
                .when().get("/connections")
                .then()
                .statusCode(200)
                .body("$", hasSize(2));

        // VALORANT carries the pending conduct-engine flag AND cross-game signal from CS2.
        given()
                .header("Authorization", "Bearer " + token)
                .when().get("/results/" + DemoHistorySeeder.DEMO_CONN_VALORANT)
                .then()
                .statusCode(200)
                .body("globalTrustScore", is(62))
                .body("conductScore", is(84))
                .body("status", is("pending"))
                .body("caseHistory", hasSize(1))
                .body("auditTrail", hasSize(1))
                .body("crossGameSignals", hasSize(1))
                .body("crossGameSignals[0].hasActiveBan", is(true));

        // Counter-Strike 2 carries the confirmed anti-cheat verdict + active appealable ban.
        given()
                .header("Authorization", "Bearer " + token)
                .when().get("/bans")
                .then()
                .statusCode(200)
                .body("$", hasSize(1))
                .body("[0].appealable", is(true));

        given()
                .header("Authorization", "Bearer " + token)
                .when().get("/appeals")
                .then()
                .statusCode(200)
                .body("appealable", hasSize(1));

        given()
                .header("Authorization", "Bearer " + token)
                .when().get("/trust-history")
                .then()
                .statusCode(200)
                .body("$", hasSize(greaterThanOrEqualTo(3)));
    }
}

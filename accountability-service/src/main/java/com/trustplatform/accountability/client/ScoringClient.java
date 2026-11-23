package com.trustplatform.accountability.client;

import com.trustplatform.accountability.dto.ScoreRequest;
import com.trustplatform.accountability.dto.ScoreResponse;
import io.smallrye.mutiny.Uni;
import jakarta.ws.rs.Consumes;
import jakarta.ws.rs.POST;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.core.MediaType;
import org.eclipse.microprofile.rest.client.inject.RegisterRestClient;

@Path("/score")
@RegisterRestClient(configKey = "detection-engine")
@Consumes(MediaType.APPLICATION_JSON)
@Produces(MediaType.APPLICATION_JSON)
public interface ScoringClient {

    @POST
    Uni<ScoreResponse> score(ScoreRequest request);
}


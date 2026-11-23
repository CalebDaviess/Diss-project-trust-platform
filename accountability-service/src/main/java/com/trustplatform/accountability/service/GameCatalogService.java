package com.trustplatform.accountability.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.trustplatform.accountability.dto.GameSearchResult;
import jakarta.enterprise.context.ApplicationScoped;
import org.jboss.logging.Logger;

import java.net.URI;
import java.net.URLEncoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import java.util.stream.Collectors;

/**
 * Game catalogue search, proxied server-side over the public Steam storefront search endpoint
 * (no API key required). Proxying server-side avoids exposing any key and sidesteps browser CORS.
 * On any failure it returns an empty list so the portal degrades gracefully.
 */
@ApplicationScoped
public class GameCatalogService {

    private static final Logger LOG = Logger.getLogger(GameCatalogService.class);
    private static final String SEARCH_URL =
            "https://store.steampowered.com/api/storesearch/?cc=us&l=en&term=";
    private static final int MAX_RESULTS = 24;

    private final HttpClient httpClient = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(4))
            .build();
    private final ObjectMapper objectMapper = new ObjectMapper();

    public List<GameSearchResult> search(String query) {
        if (query == null || query.isBlank()) {
            return List.of();
        }
        List<GameSearchResult> steam = searchSteam(query);
        List<GameSearchResult> curated = CuratedGameCatalog.search(query);
        return merge(steam, curated);
    }

    /**
     * Steam results first (they carry logos), then curated non-Steam titles that Steam didn't
     * already return (deduped by name, case-insensitively), capped at {@link #MAX_RESULTS}.
     */
    private List<GameSearchResult> merge(List<GameSearchResult> steam, List<GameSearchResult> curated) {
        List<GameSearchResult> merged = new ArrayList<>(steam);
        Set<String> seen = steam.stream()
                .map(r -> r.name().toLowerCase(Locale.ROOT))
                .collect(Collectors.toCollection(HashSet::new));
        for (GameSearchResult c : curated) {
            if (merged.size() >= MAX_RESULTS) {
                break;
            }
            if (seen.add(c.name().toLowerCase(Locale.ROOT))) {
                merged.add(c);
            }
        }
        return merged.size() > MAX_RESULTS ? merged.subList(0, MAX_RESULTS) : merged;
    }

    private List<GameSearchResult> searchSteam(String query) {
        try {
            String url = SEARCH_URL + URLEncoder.encode(query.trim(), StandardCharsets.UTF_8);
            HttpRequest request = HttpRequest.newBuilder(URI.create(url))
                    .timeout(Duration.ofSeconds(6))
                    .header("Accept", "application/json")
                    .GET()
                    .build();
            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
            if (response.statusCode() != 200) {
                LOG.debugf("Steam search returned HTTP %d for '%s'", response.statusCode(), query);
                return List.of();
            }
            return parse(response.body());
        } catch (Exception e) {
            LOG.debugf(e, "Steam catalogue search failed for '%s'", query);
            return List.of();
        }
    }

    private List<GameSearchResult> parse(String body) throws Exception {
        JsonNode items = objectMapper.readTree(body).path("items");
        List<GameSearchResult> results = new ArrayList<>();
        for (JsonNode item : items) {
            if (results.size() >= MAX_RESULTS) {
                break;
            }
            String name = item.path("name").asText(null);
            String id = item.path("id").asText(null);
            if (name == null || id == null) {
                continue;
            }
            results.add(new GameSearchResult(id, name, headerImageUrl(id), "steam"));
        }
        return results;
    }

    /**
     * Stable Steam CDN cover-art URL for an appid. We build this instead of using the search
     * response's volatile {@code tiny_image}: the {@code steamcdn-a.akamaihd.net} host allows
     * image hotlinking (the newer cloudflare/akamai hosts block it), so these load reliably.
     */
    static String headerImageUrl(String appId) {
        return "https://steamcdn-a.akamaihd.net/steam/apps/" + appId + "/header.jpg";
    }
}

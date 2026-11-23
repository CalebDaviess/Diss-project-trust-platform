package com.trustplatform.accountability.dto;

/**
 * A single game catalogue hit for the add-a-game search.
 *
 * @param id       catalogue id (a Steam appid, or a "provider:slug" for curated non-Steam titles)
 * @param name     display name
 * @param imageUrl cover-art URL (null for titles without a hotlinkable logo)
 * @param provider the title's native launcher/publisher (e.g. "steam", "epic", "riot", "battlenet")
 */
public record GameSearchResult(
        String id,
        String name,
        String imageUrl,
        String provider
) {
}

package com.trustplatform.accountability.service;

import com.trustplatform.accountability.dto.GameSearchResult;

import java.util.List;
import java.util.Locale;

/**
 * A small curated catalogue of popular titles that are NOT on Steam (Epic / Riot / Battle.net /
 * EA / Ubisoft / Mojang / Roblox / HoYoverse / mobile), used to supplement the Steam search so
 * launcher-exclusive games (e.g. Rocket League, Fortnite, League of Legends, Valorant) can be
 * linked too. There is no single key-less API covering every launcher; a keyed catalogue
 * (e.g. IGDB) would replace this list in production.
 *
 * <p>These entries have no hotlinkable logo, so the portal shows a clean titled tile for them.
 */
final class CuratedGameCatalog {

    private CuratedGameCatalog() {
    }

    private record Entry(String name, String provider) {
        GameSearchResult toResult() {
            String slug = name.toLowerCase(Locale.ROOT).replaceAll("[^a-z0-9]+", "-").replaceAll("(^-|-$)", "");
            return new GameSearchResult(provider + ":" + slug, name, null, provider);
        }
    }

    private static final List<Entry> ENTRIES = List.of(
            // Epic Games
            new Entry("Rocket League", "epic"),
            new Entry("Fortnite", "epic"),
            new Entry("Fall Guys", "epic"),
            new Entry("Alan Wake 2", "epic"),
            // Riot Games
            new Entry("League of Legends", "riot"),
            new Entry("VALORANT", "riot"),
            new Entry("Teamfight Tactics", "riot"),
            new Entry("Legends of Runeterra", "riot"),
            new Entry("League of Legends: Wild Rift", "riot"),
            // Battle.net (Blizzard / Activision)
            new Entry("World of Warcraft", "battlenet"),
            new Entry("Hearthstone", "battlenet"),
            new Entry("Heroes of the Storm", "battlenet"),
            new Entry("StarCraft II", "battlenet"),
            new Entry("Warcraft III: Reforged", "battlenet"),
            new Entry("Diablo Immortal", "battlenet"),
            new Entry("Call of Duty: Warzone", "battlenet"),
            new Entry("Call of Duty: Modern Warfare III", "battlenet"),
            // EA
            new Entry("EA Sports FC 24", "ea"),
            new Entry("Battlefield 2042", "ea"),
            new Entry("The Sims 4", "ea"),
            new Entry("Need for Speed Unbound", "ea"),
            // Ubisoft
            new Entry("Tom Clancy's Rainbow Six Siege", "ubisoft"),
            new Entry("Tom Clancy's The Division 2", "ubisoft"),
            new Entry("Assassin's Creed Valhalla", "ubisoft"),
            new Entry("Far Cry 6", "ubisoft"),
            // Mojang / Microsoft
            new Entry("Minecraft", "microsoft"),
            new Entry("Minecraft Legends", "microsoft"),
            // Roblox
            new Entry("Roblox", "roblox"),
            // HoYoverse
            new Entry("Genshin Impact", "hoyoverse"),
            new Entry("Honkai: Star Rail", "hoyoverse"),
            new Entry("Zenless Zone Zero", "hoyoverse"),
            // Mobile / other launchers
            new Entry("Clash of Clans", "supercell"),
            new Entry("Clash Royale", "supercell"),
            new Entry("Brawl Stars", "supercell"),
            new Entry("Pokémon GO", "niantic"),
            new Entry("Final Fantasy XIV", "square-enix"),
            new Entry("Old School RuneScape", "jagex"),
            new Entry("RuneScape", "jagex")
    );

    /** Curated titles whose name contains the (lowercased) query. */
    static List<GameSearchResult> search(String query) {
        String q = query.toLowerCase(Locale.ROOT).trim();
        return ENTRIES.stream()
                .filter(e -> e.name().toLowerCase(Locale.ROOT).contains(q))
                .map(Entry::toResult)
                .toList();
    }
}

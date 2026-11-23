import {
  siEpicgames,
  siRiotgames,
  siBattledotnet,
  siEa,
  siUbisoft,
  siPlaystation,
  siRoblox,
  siSupercell,
  siSquareenix,
} from "simple-icons";

/**
 * Brand tiles used to label which launcher a (non-Steam) game connection belongs to. The glyph
 * paths come from simple-icons (CC0); they're functional platform identifiers. A few launchers
 * aren't in the set — those use a branded tile with the launcher's initial instead.
 */
export interface LauncherBrand {
  name: string;
  /** Tile background colour. */
  bg: string;
  /** Glyph/text colour. */
  fg: string;
  /** simple-icons 24×24 path, when available. */
  path?: string;
}

export const LAUNCHERS: Record<string, LauncherBrand> = {
  epic: { name: "Epic Games", bg: "#2A2A2A", fg: "#ffffff", path: siEpicgames.path },
  riot: { name: "Riot Games", bg: "#EB0029", fg: "#ffffff", path: siRiotgames.path },
  battlenet: { name: "Battle.net", bg: "#1787E0", fg: "#ffffff", path: siBattledotnet.path },
  ea: { name: "EA", bg: "#FF4747", fg: "#ffffff", path: siEa.path },
  ubisoft: { name: "Ubisoft", bg: "#1A1A1A", fg: "#ffffff", path: siUbisoft.path },
  psn: { name: "PlayStation", bg: "#003791", fg: "#ffffff", path: siPlaystation.path },
  roblox: { name: "Roblox", bg: "#232527", fg: "#ffffff", path: siRoblox.path },
  supercell: { name: "Supercell", bg: "#0A0A0A", fg: "#ffffff", path: siSupercell.path },
  "square-enix": { name: "Square Enix", bg: "#ED1C24", fg: "#ffffff", path: siSquareenix.path },
  // Not in the icon set — branded initial tiles.
  xbox: { name: "Xbox", bg: "#107C10", fg: "#ffffff" },
  microsoft: { name: "Microsoft", bg: "#0067B8", fg: "#ffffff" },
  hoyoverse: { name: "HoYoverse", bg: "#2A9DF4", fg: "#ffffff" },
  niantic: { name: "Niantic", bg: "#FFC400", fg: "#1a1a1a" },
  jagex: { name: "Jagex", bg: "#C8102E", fg: "#ffffff" },
};

export function launcherBrand(provider?: string | null): LauncherBrand | undefined {
  return provider ? LAUNCHERS[provider] : undefined;
}

import { useMemo, useState } from "react";
import { LauncherLogo } from "./LauncherLogo";

/** Build stable, hotlink-friendly Steam CDN candidates from a numeric appid. */
function steamCandidates(appId: string): string[] {
  if (!/^\d+$/.test(appId)) return [];
  const base = `https://steamcdn-a.akamaihd.net/steam/apps/${appId}`;
  return [`${base}/header.jpg`, `${base}/capsule_231x87.jpg`];
}

interface GameLogoProps {
  src?: string | null;
  /** Catalogue id — used to derive Steam cover-art candidates when it's a numeric appid. */
  appId?: string;
  name: string;
  /** Native launcher — non-Steam games with no cover art show the launcher's brand tile. */
  provider?: string | null;
  width?: number;
}

/**
 * A game's cover art. Tries the provided URL, then Steam header/capsule candidates (derived from a
 * numeric appid). If none load, it shows the launcher's brand tile (Epic, Riot, …) when a provider
 * is known, otherwise a titled gradient tile. `referrerPolicy=no-referrer` avoids hotlink blocks.
 */
export function GameLogo({ src, appId, name, provider, width = 92 }: GameLogoProps) {
  const candidates = useMemo(() => {
    const list = [src, ...(appId ? steamCandidates(appId) : [])].filter((u): u is string => !!u);
    return Array.from(new Set(list));
  }, [src, appId]);
  const [idx, setIdx] = useState(0);
  const height = Math.round(width * 0.467);

  if (candidates.length === 0 || idx >= candidates.length) {
    if (provider && provider !== "steam") {
      return <LauncherLogo provider={provider} width={width} height={height} />;
    }
    return (
      <span className="gamelogo gamelogo--fallback" style={{ width, height }} aria-hidden="true">
        {name.slice(0, 1).toUpperCase()}
      </span>
    );
  }
  return (
    <img
      className="gamelogo"
      src={candidates[idx]}
      alt=""
      style={{ width, height }}
      loading="lazy"
      referrerPolicy="no-referrer"
      onError={() => setIdx((i) => i + 1)}
    />
  );
}

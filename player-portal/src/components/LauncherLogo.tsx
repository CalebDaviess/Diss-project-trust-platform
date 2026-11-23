import { launcherBrand } from "../features/launchers";

interface LauncherLogoProps {
  provider?: string | null;
  width: number;
  height: number;
}

/**
 * A branded tile identifying the launcher a non-Steam game is linked through (Epic, Riot,
 * Battle.net, …). Shows the launcher's mark when available, otherwise its initial on the brand
 * colour. Purely a functional platform label.
 */
export function LauncherLogo({ provider, width, height }: LauncherLogoProps) {
  const brand = launcherBrand(provider);
  if (!brand) {
    return (
      <span className="gamelogo gamelogo--fallback" style={{ width, height }} aria-hidden="true">
        {(provider ?? "?").slice(0, 1).toUpperCase()}
      </span>
    );
  }
  const glyph = Math.round(Math.min(width, height) * 0.58);
  return (
    <span
      className="launcherlogo"
      style={{ width, height, background: brand.bg, color: brand.fg }}
      title={brand.name}
      aria-label={brand.name}
    >
      {brand.path ? (
        <svg viewBox="0 0 24 24" width={glyph} height={glyph} fill="currentColor" aria-hidden="true">
          <path d={brand.path} />
        </svg>
      ) : (
        <span className="launcherlogo__initial">{brand.name.slice(0, 1)}</span>
      )}
    </span>
  );
}

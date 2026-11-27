/**
 * Whether interactive prototype/demo controls (Simulate report, Simulate anti-cheat,
 * Simulate ban, Approve/Deny appeal review, DevTierPreview) should be shown.
 *
 * Enabled automatically in Vite dev mode (`npm run dev`) AND in packaged Docker demo
 * builds via `VITE_ENABLE_DEMO_CONTROLS=true`.
 */
export const DEMO_CONTROLS_ENABLED: boolean =
  import.meta.env.DEV || String(import.meta.env.VITE_ENABLE_DEMO_CONTROLS ?? "").toLowerCase() === "true";

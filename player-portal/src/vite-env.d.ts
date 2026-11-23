/// <reference types="vite/client" />
interface ImportMetaEnv {
  /** Base URL of the accountability-service backend. Defaults to http://localhost:8081. */
  readonly VITE_API_BASE_URL?: string;
  /** Dev-only: username prefilled into the sign-in form (matches the seeded demo user). */
  readonly VITE_DEMO_USERNAME?: string;
  /** Dev-only: password prefilled into the sign-in form (matches the seeded demo user). */
  readonly VITE_DEMO_PASSWORD?: string;
}
interface ImportMeta {
  readonly env: ImportMetaEnv;
}

/**
 * Typed client for the accountability-service (Quarkus) backend.
 *
 * --- Identity (JWT) ---------------------------------------------------------
 * The player signs in via `POST /auth` (see login()) to obtain a stateless JWT.
 * Every subsequent request carries `Authorization: Bearer <token>`; the backend
 * resolves identity from the token's `sub`. There is no `X-Profile-Id` header.
 * --------------------------------------------------------------------------
 */

/** Communication channel a conduct sample was observed on. */
export type ConductChannel = "text" | "voice";

/**
 * Conduct feature vector (toxic chat/voice). Features are computed at source — raw chat/voice
 * never crosses the wire, only these privacy-preserving signals. All six scores are 0.0..1.0.
 * `channel` is metadata (it names the offence when flagged: text → chatAbuse, voice → voiceAbuse),
 * not a model input. Mirrors the backend ConductFeatureVector.
 */
export interface ConductFeatureVector {
  channel: ConductChannel;
  /** 0.0..1.0 — share of tokens hitting the toxicity lexicon. */
  toxicityLexiconScore: number;
  /** 0.0..1.0 — severity-weighted toxicity (slurs/threats weigh more than mild profanity). */
  severityWeighted: number;
  /** 0.0..1.0 — targeted at a person (harassment) vs general venting. */
  targetedHarassment: number;
  /** 0.0..1.0 — proportion of shouted/uppercase content. */
  capsRatio: number;
  /** 0.0..1.0 — repeated phrases / spam. */
  repetitionRate: number;
  /** 0.0..1.0 — burstiness of messages over the window. */
  messageBurstRate: number;
}

/** Request body for POST /samples (mirrors backend SampleSubmission record). */
export interface SampleSubmission {
  gameConnectionId: string;
  operatorId: string;
  gameId: string;
  features: ConductFeatureVector;
  evidenceLink?: string;
}

/** Backend AccountabilityStatus values (serialised lowercase). */
export type AccountabilityStatus = "pending" | "confirmed" | "appealed" | "overturned";

/** Where an accountability signal originated (serialised lowerCamel). */
export type OffenceSource = "conductEngine" | "antiCheat" | "operator" | "player";

/** One entry in a player's case history. */
export interface CaseView {
  /** ISO-8601 timestamp. */
  timestamp: string;
  /** Conduct: "chatAbuse" | "voiceAbuse". External anti-cheat: "aimbot" | … . "none" when clean. */
  offenceType: string;
  /** Which authority produced this signal (conduct engine / anti-cheat / operator). */
  source: OffenceSource;
  score: number;
  status: string;
}

/**
 * One immutable, source-attributed line in a record's audit trail — "who did what, when, why"
 * for every state change (conduct flagged, anti-cheat verdict confirmed, operator ban, appeal).
 */
export interface AuditView {
  /** ISO-8601 timestamp. */
  occurredAt: string;
  source: OffenceSource;
  actor: string;
  action: string;
  detail?: string | null;
}

/** A signal from another operator/game about the same identity. */
export interface CrossGameSignalView {
  operatorId: string;
  gameId: string;
  /** Game name + logo for display (fall back to gameId). */
  gameName?: string | null;
  imageUrl?: string | null;
  /** The other game's native launcher/publisher. */
  provider?: string | null;
  /** The other game's current record status (e.g. "confirmed", "overturned"). */
  recordStatus?: string | null;
  /** Confirmed offences, excluding any overturned on appeal. */
  confirmedOffenceCount: number;
  hasActiveBan: boolean;
  /** Ban detail — present only when `hasActiveBan` is true. */
  banReason?: string | null;
  bannedAt?: string | null;
  banExpiresAt?: string | null;
}

/** Response from POST /samples and GET /results/{connectionId}. */
export interface ResultView {
  gameConnectionId: string;
  /** Current game's name + logo + launcher (null for an unknown connection). */
  gameName?: string | null;
  gameImageUrl?: string | null;
  gameProvider?: string | null;
  /** Always present, 0..100. */
  globalTrustScore: number;
  /** Total linked games (real connections — never collapses when a sanction clears). */
  linkedGamesCount?: number;
  /** Total active bans across linked games. */
  activeBanCount?: number;
  /** The conduct detector's score for this game; null when the player has no record here. */
  conductScore: number | null;
  status: AccountabilityStatus | null;
  crossGameSignals: CrossGameSignalView[];
  caseHistory: CaseView[];
  /** Full source-attributed audit trail for this record (empty when no record). */
  auditTrail: AuditView[];
}

/** Credentials for POST /auth. */
export interface AuthRequest {
  username: string;
  password: string;
}

/** Identity-document types offered at account creation (mock "upload & verify" only). */
export type IdDocumentType =
  | "passport"
  | "drivers-licence"
  | "national-id"
  | "credit-card"
  | "residence-permit";

/** A verified adult guardian who vouches for an under-18 account. */
export interface GuardianInfo {
  name: string;
  email: string;
  idType?: IdDocumentType;
}

/**
 * Account-creation request for POST /auth/register. `idType` is captured for the mock upload step.
 * Age assurance: `over18` is the holder's self-declaration (the mocked ID check confirms it before
 * submit). For an under-18 account, `holderName` is the child's name and `guardian` is the vouching
 * adult; `allowMatureGames` is the guardian's consent for 18+ rated games.
 */
export interface RegisterRequest {
  username: string;
  password: string;
  idType?: IdDocumentType;
  over18?: boolean;
  holderName?: string;
  guardian?: GuardianInfo;
  allowMatureGames?: boolean;
}

/** GET /profile — account-level overview (type, guardian, 18+ access). */
export interface ProfileView {
  profileId: string;
  globalTrustScore: number;
  createdAt: string | null;
  accountType: "ADULT" | "GUARDIAN_MINOR" | string;
  guardianControlled: boolean;
  holderName: string | null;
  guardianName: string | null;
  guardianEmail: string | null;
  matureAccessAllowed: boolean;
}

/** Token response from POST /auth. */
export interface AuthResponse {
  token: string;
  tokenType: string;
  expiresIn: number;
}

/** Thrown for any non-2xx response; carries the HTTP status and response text. */
export class ApiError extends Error {
  readonly status: number;
  readonly body: string;

  constructor(status: number, body: string) {
    super(`Request failed (${status}): ${body || "no response body"}`);
    this.name = "ApiError";
    this.status = status;
    this.body = body;
  }
}

const DEFAULT_BASE_URL = "http://localhost:8081";

/** Resolved base URL, trailing slash trimmed. */
export function apiBaseUrl(): string {
  const configured = import.meta.env.VITE_API_BASE_URL?.trim();
  const base = configured && configured.length > 0 ? configured : DEFAULT_BASE_URL;
  return base.replace(/\/+$/, "");
}

/** Headers for an authenticated JSON request. */
function buildHeaders(token: string): HeadersInit {
  return {
    "Content-Type": "application/json",
    Accept: "application/json",
    Authorization: `Bearer ${token}`,
  };
}

async function parseOrThrow(response: Response): Promise<ResultView> {
  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new ApiError(response.status, text);
  }
  return (await response.json()) as ResultView;
}

/** POST /auth — exchange credentials for a JWT. Throws ApiError (401) on bad credentials. */
export async function login(username: string, password: string): Promise<AuthResponse> {
  const response = await fetch(`${apiBaseUrl()}/auth`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({ username, password } satisfies AuthRequest),
  });
  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new ApiError(response.status, text);
  }
  return (await response.json()) as AuthResponse;
}

/**
 * POST /auth/register — create a new player account and return a JWT (auto sign-in).
 * Throws ApiError(409) if the email is already registered, ApiError(400) on invalid input,
 * or ApiError(403) if self-registration is disabled on the backend.
 */
export async function register(request: RegisterRequest): Promise<AuthResponse> {
  const response = await fetch(`${apiBaseUrl()}/auth/register`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(request),
  });
  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new ApiError(response.status, text);
  }
  return (await response.json()) as AuthResponse;
}

/**
 * A clean, client-side "no activity yet" view for a freshly created account. New accounts have
 * no game connection, so the backend has nothing to return for a default lookup — we show the
 * default trust score and empty history until the player generates activity.
 */
export function emptyResult(connectionId: string): ResultView {
  return {
    gameConnectionId: connectionId,
    globalTrustScore: 100,
    linkedGamesCount: 0,
    activeBanCount: 0,
    conductScore: null,
    status: null,
    crossGameSignals: [],
    caseHistory: [],
    auditTrail: [],
  };
}

/** POST /samples — submit a gameplay sample and return the resulting ResultView. */
export async function submitSample(
  token: string,
  submission: SampleSubmission,
): Promise<ResultView> {
  const response = await fetch(`${apiBaseUrl()}/samples`, {
    method: "POST",
    headers: buildHeaders(token),
    body: JSON.stringify(submission),
  });
  return parseOrThrow(response);
}

/** GET /results/{connectionId} — look up the current ResultView for a connection. */
export async function getResult(
  token: string,
  connectionId: string,
): Promise<ResultView> {
  const encoded = encodeURIComponent(connectionId);
  const response = await fetch(`${apiBaseUrl()}/results/${encoded}`, {
    method: "GET",
    headers: buildHeaders(token),
  });
  return parseOrThrow(response);
}

/** Request body for the dev-only POST /dev/anti-cheat-verdicts/simulate demo hook. */
export interface SimulateAntiCheatRequest {
  connectionId: string;
  operatorId: string;
  gameId: string;
}

/**
 * POST /dev/anti-cheat-verdicts/simulate — dev/test-only demo hook.
 *
 * Triggers the backend's in-module simulated anti-cheat vendor so an *external* cheat verdict lands
 * as a confirmed, audited case against the signed-in player's own connection — demonstrating the
 * detection-source asymmetry (external → confirmed vs own conduct engine → pending) and the drop in
 * global trust. Returns the updated ResultView. Disabled in production, where it responds 404 and
 * real verdicts arrive at /anti-cheat-verdicts from an authenticated vendor instead.
 */
export async function simulateAntiCheatVerdict(
  token: string,
  request: SimulateAntiCheatRequest,
): Promise<ResultView> {
  const response = await fetch(`${apiBaseUrl()}/dev/anti-cheat-verdicts/simulate`, {
    method: "POST",
    headers: buildHeaders(token),
    body: JSON.stringify(request),
  });
  return parseOrThrow(response);
}


/** A linked game connection (GET/POST /connections). */
export interface ConnectionView {
  connectionId: string;
  gameId: string;
  gameName: string;
  operatorId: string;
  provider: string;
  operatorAccountRef: string | null;
  imageUrl: string | null;
  status: string;
  linkedAt: string | null;
}

/** Request body for POST /connections. */
export interface CreateConnectionRequest {
  gameId: string;
  gameName: string;
  provider: string;
  operatorId?: string;
  operatorAccountRef?: string;
  imageUrl?: string;
  /** True when the title is rated 18+; gated for guardian-controlled minor accounts. */
  mature?: boolean;
}

/** A game catalogue search hit (GET /games/search). */
export interface GameSearchResult {
  id: string;
  name: string;
  imageUrl: string | null;
  /** The title's native launcher/publisher (e.g. "steam", "epic", "riot"). */
  provider: string | null;
}

/** GET /connections — list the signed-in player's linked games. */
export async function listConnections(token: string): Promise<ConnectionView[]> {
  const response = await fetch(`${apiBaseUrl()}/connections`, {
    method: "GET",
    headers: buildHeaders(token),
  });
  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new ApiError(response.status, text);
  }
  return (await response.json()) as ConnectionView[];
}

/** POST /connections — link a game to the signed-in player's identity. */
export async function createConnection(
  token: string,
  request: CreateConnectionRequest,
): Promise<ConnectionView> {
  const response = await fetch(`${apiBaseUrl()}/connections`, {
    method: "POST",
    headers: buildHeaders(token),
    body: JSON.stringify(request),
  });
  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new ApiError(response.status, text);
  }
  return (await response.json()) as ConnectionView;
}

/** DELETE /connections/{id} — unlink a game. */
export async function removeConnection(token: string, connectionId: string): Promise<void> {
  const response = await fetch(`${apiBaseUrl()}/connections/${encodeURIComponent(connectionId)}`, {
    method: "DELETE",
    headers: buildHeaders(token),
  });
  if (!response.ok && response.status !== 204) {
    const text = await response.text().catch(() => "");
    throw new ApiError(response.status, text);
  }
}

/** GET /games/search?q= — search the game catalogue (proxied Steam search). */
export async function searchGames(token: string, query: string): Promise<GameSearchResult[]> {
  const response = await fetch(`${apiBaseUrl()}/games/search?q=${encodeURIComponent(query)}`, {
    method: "GET",
    headers: buildHeaders(token),
  });
  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new ApiError(response.status, text);
  }
  return (await response.json()) as GameSearchResult[];
}

/** One entry in the cross-game activity feed (GET /activity). */
export interface ActivityItem {
  connectionId: string;
  gameId: string;
  gameName: string | null;
  imageUrl: string | null;
  provider: string | null;
  occurredAt: string;
  source: OffenceSource;
  action: string;
  actor: string;
  detail: string | null;
}

/** A confirmed sanction the player can appeal. */
export interface AppealableSanction {
  connectionId: string;
  gameId: string;
  gameName: string | null;
  imageUrl: string | null;
  provider: string | null;
  operatorId: string;
  offenceType: string | null;
  source: OffenceSource | null;
  score: number | null;
}

/** A submitted appeal and its review status. */
export interface AppealView {
  appealId: string;
  connectionId: string;
  gameId: string;
  gameName: string | null;
  imageUrl: string | null;
  provider: string | null;
  offenceType: string | null;
  grounds: string | null;
  description: string;
  evidenceCount: number;
  status: "submitted" | "approved" | "denied";
  submittedAt: string;
  resolvedAt: string | null;
  decisionNote: string | null;
}

/** Appeals tab payload (GET /appeals). */
export interface AppealsOverview {
  appealable: AppealableSanction[];
  appeals: AppealView[];
}

/** Request body for POST /appeals. */
export interface SubmitAppealRequest {
  connectionId: string;
  grounds?: string;
  description: string;
  evidenceCount?: number;
}

/** GET /activity — the player's cross-game activity feed (optionally scoped to one connection). */
export async function listActivity(token: string, connectionId?: string): Promise<ActivityItem[]> {
  const q = connectionId ? `?connectionId=${encodeURIComponent(connectionId)}` : "";
  const response = await fetch(`${apiBaseUrl()}/activity${q}`, {
    method: "GET",
    headers: buildHeaders(token),
  });
  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new ApiError(response.status, text);
  }
  return (await response.json()) as ActivityItem[];
}

/** GET /appeals — appealable sanctions + the player's submitted appeals. */
export async function listAppeals(token: string): Promise<AppealsOverview> {
  const response = await fetch(`${apiBaseUrl()}/appeals`, {
    method: "GET",
    headers: buildHeaders(token),
  });
  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new ApiError(response.status, text);
  }
  return (await response.json()) as AppealsOverview;
}

/** POST /appeals — submit an appeal against a confirmed sanction. */
export async function submitAppeal(token: string, request: SubmitAppealRequest): Promise<AppealView> {
  const response = await fetch(`${apiBaseUrl()}/appeals`, {
    method: "POST",
    headers: buildHeaders(token),
    body: JSON.stringify(request),
  });
  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new ApiError(response.status, text);
  }
  return (await response.json()) as AppealView;
}

/** POST /appeals/{id}/resolve — dev-only: simulate the studio's review decision. */
export async function resolveAppeal(
  token: string,
  appealId: string,
  decision: "approved" | "denied",
  note?: string,
): Promise<AppealView> {
  const response = await fetch(`${apiBaseUrl()}/appeals/${encodeURIComponent(appealId)}/resolve`, {
    method: "POST",
    headers: buildHeaders(token),
    body: JSON.stringify({ decision, note }),
  });
  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new ApiError(response.status, text);
  }
  return (await response.json()) as AppealView;
}

/** An active ban on one of the player's games (GET /bans). */
export interface BanView {
  connectionId: string;
  gameId: string;
  gameName: string | null;
  imageUrl: string | null;
  provider: string | null;
  operatorId: string;
  /** communication | temporary | permanent. */
  banType: string;
  reason: string | null;
  bannedAt: string;
  expiresAt: string | null;
  /** Whether the operator marked the ban appealable. */
  appealable: boolean;
}

/** Request body for the dev-only POST /dev/bans/simulate hook. */
export interface SimulateBanRequest {
  connectionId: string;
  banType: string;
  durationDays?: number | null;
  appealable?: boolean;
}

/** GET /bans — the player's active bans with type, duration and appealability. */
export async function listBans(token: string): Promise<BanView[]> {
  const response = await fetch(`${apiBaseUrl()}/bans`, {
    method: "GET",
    headers: buildHeaders(token),
  });
  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new ApiError(response.status, text);
  }
  return (await response.json()) as BanView[];
}

/** POST /dev/bans/simulate — dev-only: land a typed operator ban on the player's connection. */
export async function simulateBan(token: string, request: SimulateBanRequest): Promise<ResultView> {
  const response = await fetch(`${apiBaseUrl()}/dev/bans/simulate`, {
    method: "POST",
    headers: buildHeaders(token),
    body: JSON.stringify(request),
  });
  return parseOrThrow(response);
}

/** One point in the trust-over-time series (GET /trust-history). */
export interface TrustPointView {
  occurredAt: string;
  score: number;
  reason: string;
}

/** GET /trust-history — the player's real trust score over time (from account creation at 100). */
export async function getTrustHistory(token: string): Promise<TrustPointView[]> {
  const response = await fetch(`${apiBaseUrl()}/trust-history`, {
    method: "GET",
    headers: buildHeaders(token),
  });
  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new ApiError(response.status, text);
  }
  return (await response.json()) as TrustPointView[];
}

/** GET /profile — the signed-in account's type, guardian details and 18+ access. */
export async function getProfile(token: string): Promise<ProfileView> {
  const response = await fetch(`${apiBaseUrl()}/profile`, {
    method: "GET",
    headers: buildHeaders(token),
  });
  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new ApiError(response.status, text);
  }
  return (await response.json()) as ProfileView;
}

/** POST /profile/verify-adult — convert a guardian-controlled account to full adult access. */
export async function verifyAdult(token: string): Promise<ProfileView> {
  const response = await fetch(`${apiBaseUrl()}/profile/verify-adult`, {
    method: "POST",
    headers: buildHeaders(token),
  });
  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new ApiError(response.status, text);
  }
  return (await response.json()) as ProfileView;
}

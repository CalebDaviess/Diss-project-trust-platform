import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  ApiError,
  getResult,
  login,
  simulateAntiCheatVerdict,
  submitSample,
  type ResultView,
  type SampleSubmission,
} from "./accountabilityApi";
const SAMPLE_RESULT: ResultView = {
  gameConnectionId: "gc-1",
  globalTrustScore: 82,
  conductScore: 12,
  status: "pending",
  crossGameSignals: [
    { operatorId: "op-2", gameId: "game-b", confirmedOffenceCount: 1, hasActiveBan: true },
  ],
  caseHistory: [
    {
      timestamp: "2024-01-01T10:00:00Z",
      offenceType: "chatAbuse",
      source: "conductEngine",
      score: 90,
      status: "pending",
    },
  ],
  auditTrail: [
    {
      occurredAt: "2024-01-01T10:00:00Z",
      source: "conductEngine",
      actor: "conduct-engine",
      action: "FLAGGED",
      detail: "chatAbuse flagged for review (score 90)",
    },
  ],
};
function mockFetchOnce(response: Partial<Response> & { jsonBody?: unknown; textBody?: string }) {
  const fetchMock = vi.fn().mockResolvedValue({
    ok: response.ok ?? true,
    status: response.status ?? 200,
    json: async () => response.jsonBody,
    text: async () => response.textBody ?? "",
  } as Response);
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}
beforeEach(() => {
  // Ensure a deterministic base URL regardless of the local .env.
  vi.stubEnv("VITE_API_BASE_URL", "http://localhost:8081");
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});
describe("login", () => {
  it("POSTs credentials to /auth and returns the AuthResponse", async () => {
    const fetchMock = mockFetchOnce({
      jsonBody: { token: "jwt-abc", tokenType: "Bearer", expiresIn: 3600 },
    });
    const auth = await login("player@example.com", "demo-password");
    expect(auth).toEqual({ token: "jwt-abc", tokenType: "Bearer", expiresIn: 3600 });
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("http://localhost:8081/auth");
    expect(init.method).toBe("POST");
    expect(JSON.parse(init.body as string)).toEqual({
      username: "player@example.com",
      password: "demo-password",
    });
    // No auth header is sent on the login request itself.
    expect((init.headers as Record<string, string>)["Authorization"]).toBeUndefined();
  });
  it("throws an ApiError on 401 (bad credentials)", async () => {
    mockFetchOnce({ ok: false, status: 401, textBody: "" });
    await expect(login("player@example.com", "wrong")).rejects.toBeInstanceOf(ApiError);
  });
});
describe("submitSample", () => {
  it("POSTs to /samples with the Authorization bearer header and body, and parses the ResultView", async () => {
    const fetchMock = mockFetchOnce({ jsonBody: SAMPLE_RESULT });
    const submission: SampleSubmission = {
      gameConnectionId: "gc-1",
      operatorId: "op-1",
      gameId: "game-a",
      features: {
        channel: "text",
        toxicityLexiconScore: 0.32,
        severityWeighted: 0.16,
        targetedHarassment: 0.12,
        capsRatio: 0.38,
        repetitionRate: 0.2,
        messageBurstRate: 0.3,
      },
      evidenceLink: "https://evidence.example/clip-1",
    };
    const result = await submitSample("jwt-token", submission);
    expect(result).toEqual(SAMPLE_RESULT);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("http://localhost:8081/samples");
    expect(init.method).toBe("POST");
    const headers = init.headers as Record<string, string>;
    expect(headers["Authorization"]).toBe("Bearer jwt-token");
    expect(headers["X-Profile-Id"]).toBeUndefined();
    expect(headers["Content-Type"]).toBe("application/json");
    expect(JSON.parse(init.body as string)).toEqual(submission);
  });
});
describe("getResult", () => {
  it("GETs /results/{connectionId} with the Authorization bearer header and parses the ResultView", async () => {
    const fetchMock = mockFetchOnce({ jsonBody: SAMPLE_RESULT });
    const result = await getResult("jwt-token", "gc-1");
    expect(result).toEqual(SAMPLE_RESULT);
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("http://localhost:8081/results/gc-1");
    expect(init.method).toBe("GET");
    expect((init.headers as Record<string, string>)["Authorization"]).toBe("Bearer jwt-token");
  });
  it("URL-encodes the connection ID", async () => {
    const fetchMock = mockFetchOnce({ jsonBody: SAMPLE_RESULT });
    await getResult("jwt-token", "gc 1/x");
    const [url] = fetchMock.mock.calls[0] as [string];
    expect(url).toBe("http://localhost:8081/results/gc%201%2Fx");
  });
  it("throws an ApiError carrying status and response text on non-2xx", async () => {
    mockFetchOnce({ ok: false, status: 404, textBody: "not found" });
    await expect(getResult("jwt-token", "missing")).rejects.toMatchObject({
      name: "ApiError",
      status: 404,
    });
    await expect(getResult("jwt-token", "missing")).rejects.toBeInstanceOf(ApiError);
  });
});
describe("simulateAntiCheatVerdict", () => {
  it("POSTs the connection to /dev/anti-cheat-verdicts/simulate with the bearer header and parses the ResultView", async () => {
    const fetchMock = mockFetchOnce({ jsonBody: SAMPLE_RESULT });
    const result = await simulateAntiCheatVerdict("jwt-token", {
      connectionId: "gc-1",
      operatorId: "op-1",
      gameId: "game-a",
    });
    expect(result).toEqual(SAMPLE_RESULT);
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("http://localhost:8081/dev/anti-cheat-verdicts/simulate");
    expect(init.method).toBe("POST");
    const headers = init.headers as Record<string, string>;
    expect(headers["Authorization"]).toBe("Bearer jwt-token");
    expect(JSON.parse(init.body as string)).toEqual({
      connectionId: "gc-1",
      operatorId: "op-1",
      gameId: "game-a",
    });
  });
  it("propagates a 404 (production — demo hook disabled) as an ApiError", async () => {
    mockFetchOnce({ ok: false, status: 404, textBody: "" });
    await expect(
      simulateAntiCheatVerdict("jwt-token", {
        connectionId: "gc-1",
        operatorId: "op-1",
        gameId: "game-a",
      }),
    ).rejects.toBeInstanceOf(ApiError);
  });
});

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import App from "./App";
import type { ConnectionView } from "./api/accountabilityApi";

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

describe("Linked games reactivity across Games, Dashboard, Account, and sidebar", () => {
  let connectionsStore: ConnectionView[];

  beforeEach(() => {
    window.sessionStorage.clear();
    connectionsStore = [
      {
        connectionId: "gc-val",
        gameId: "riot:valorant",
        gameName: "VALORANT",
        operatorId: "riot",
        provider: "riot",
        operatorAccountRef: "Demo#EUW",
        imageUrl: null,
        status: "active",
        linkedAt: "2026-11-10T10:00:00Z",
      },
      {
        connectionId: "gc-cs2",
        gameId: "730",
        gameName: "Counter-Strike 2",
        operatorId: "steam",
        provider: "steam",
        operatorAccountRef: "76561198000",
        imageUrl: null,
        status: "active",
        linkedAt: "2026-11-10T10:00:00Z",
      },
    ];

    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
        const url = typeof input === "string" ? input : input.toString();
        const method = (init?.method ?? "GET").toUpperCase();

        if (url.endsWith("/auth") && method === "POST") {
          return jsonResponse({ token: "test-jwt", tokenType: "Bearer", expiresIn: 3600 });
        }
        if (url.endsWith("/profile")) {
          return jsonResponse({
            profileId: "sha256:demo",
            globalTrustScore: 62,
            createdAt: "2026-11-10T10:00:00Z",
            accountType: "ADULT",
            guardianControlled: false,
            holderName: "Demo Player",
            guardianName: null,
            guardianEmail: null,
            matureAccessAllowed: true,
          });
        }
        if (url.endsWith("/connections") && method === "GET") {
          return jsonResponse([...connectionsStore]);
        }
        if (url.endsWith("/connections") && method === "POST") {
          const payload = JSON.parse(String(init?.body ?? "{}")) as {
            gameId: string;
            gameName: string;
            provider: string;
            operatorId?: string;
            operatorAccountRef?: string;
            imageUrl?: string;
          };
          const created: ConnectionView = {
            connectionId: `gc-${payload.gameId}`,
            gameId: payload.gameId,
            gameName: payload.gameName,
            operatorId: payload.operatorId ?? `op-${payload.provider}`,
            provider: payload.provider,
            operatorAccountRef: payload.operatorAccountRef ?? "Player#1",
            imageUrl: payload.imageUrl ?? null,
            status: "active",
            linkedAt: "2026-11-27T14:00:00Z",
          };
          connectionsStore = [created, ...connectionsStore];
          return jsonResponse(created);
        }
        if (url.includes("/connections/") && method === "DELETE") {
          const id = decodeURIComponent(url.split("/connections/")[1]);
          connectionsStore = connectionsStore.filter((c) => c.connectionId !== id);
          return new Response(null, { status: 204 });
        }
        if (url.includes("/games/search")) {
          return jsonResponse([
            { id: "2357570", name: "Overwatch 2", imageUrl: null, provider: "battlenet" },
          ]);
        }
        if (url.includes("/results/")) {
          const id = decodeURIComponent(url.split("/results/")[1]);
          const conn = connectionsStore.find((c) => c.connectionId === id);
          return jsonResponse({
            gameConnectionId: id,
            gameName: conn?.gameName ?? null,
            gameImageUrl: null,
            gameProvider: conn?.provider ?? null,
            globalTrustScore: 62,
            linkedGamesCount: connectionsStore.length,
            activeBanCount: connectionsStore.some((c) => c.connectionId === "gc-cs2") ? 1 : 0,
            conductScore: id === "gc-val" ? 84 : 0,
            status: id === "gc-cs2" ? "confirmed" : "pending",
            crossGameSignals: [],
            caseHistory: [],
            auditTrail: [],
          });
        }
        if (url.endsWith("/appeals")) {
          return jsonResponse({
            appealable: connectionsStore.some((c) => c.connectionId === "gc-cs2")
              ? [
                  {
                    connectionId: "gc-cs2",
                    gameId: "730",
                    gameName: "Counter-Strike 2",
                    imageUrl: null,
                    provider: "steam",
                    operatorId: "steam",
                    offenceType: "aimbot",
                    source: "antiCheat",
                    score: 94,
                  },
                ]
              : [],
            appeals: [],
          });
        }
        if (url.endsWith("/bans")) {
          return jsonResponse(
            connectionsStore.some((c) => c.connectionId === "gc-cs2")
              ? [
                  {
                    connectionId: "gc-cs2",
                    gameId: "730",
                    gameName: "Counter-Strike 2",
                    imageUrl: null,
                    provider: "steam",
                    operatorId: "steam",
                    banType: "temporary",
                    reason: "Aimbot violation",
                    bannedAt: "2026-11-25T10:00:00Z",
                    expiresAt: "2026-12-09T10:00:00Z",
                    appealable: true,
                  },
                ]
              : [],
          );
        }
        if (url.endsWith("/activity") || url.endsWith("/trust-history")) {
          return jsonResponse([]);
        }
        return jsonResponse({});
      }),
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("updates linked games immediately across Games, Dashboard, Account, and sidebar on link and unlink", async () => {
    const user = userEvent.setup();
    render(<App />);

    // Sign in with prefilled demo credentials.
    await user.click(screen.getByRole("button", { name: /^sign in$/i }));

    // Dashboard starts at 2 linked games (including banned CS2).
    const dashGamesCard = await screen.findByRole("button", { name: /linked games: 2/i });
    expect(dashGamesCard).toBeInTheDocument();

    // Navigate to Games tab.
    const nav = screen.getByRole("navigation", { name: /main/i });
    const gamesNavBtn = within(nav).getByRole("button", { name: /games/i });
    expect(gamesNavBtn).toHaveTextContent("2");
    await user.click(gamesNavBtn);

    expect(await screen.findByText("VALORANT")).toBeInTheDocument();
    expect(screen.getByText("Counter-Strike 2")).toBeInTheDocument();

    // Link a 3rd game (Overwatch 2).
    await user.click(screen.getByRole("button", { name: /\+ add a game/i }));
    await user.click(screen.getByRole("button", { name: "Overwatch 2" }));
    const owHit = await screen.findByRole("button", { name: /overwatch 2/i });
    await user.click(owHit);
    await user.click(screen.getByRole("button", { name: /connect with battle\.net/i }));

    // Immediately appears in Games tab & sidebar badge becomes 3.
    expect(await screen.findByText(/overwatch 2 is now linked/i)).toBeInTheDocument();
    expect(within(nav).getByRole("button", { name: /games/i })).toHaveTextContent("3");

    // Dashboard & Account both immediately show 3 linked games.
    await user.click(within(nav).getByRole("button", { name: /dashboard/i }));
    expect(await screen.findByRole("button", { name: /linked games: 3/i })).toBeInTheDocument();

    await user.click(within(nav).getByRole("button", { name: /account/i }));
    const accGamesCard = await screen.findByRole("button", { name: /linked games: 3/i });
    expect(accGamesCard).toBeInTheDocument();

    // Unlink Overwatch 2 from Games tab -> immediately drops back to 2 everywhere.
    await user.click(within(nav).getByRole("button", { name: /games/i }));
    const owCard = screen.getByText("Overwatch 2").closest("li")!;
    await user.click(within(owCard).getByRole("button", { name: /^unlink$/i }));
    await user.click(within(owCard).getByRole("button", { name: /confirm unlink/i }));

    await waitFor(() => {
      expect(within(nav).getByRole("button", { name: /games/i })).toHaveTextContent("2");
    });

    await user.click(within(nav).getByRole("button", { name: /dashboard/i }));
    expect(await screen.findByRole("button", { name: /linked games: 2/i })).toBeInTheDocument();

    await user.click(within(nav).getByRole("button", { name: /account/i }));
    expect(await screen.findByRole("button", { name: /linked games: 2/i })).toBeInTheDocument();
  });
});

import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { ResultsPanel } from "./ResultsPanel";
import type { ResultView } from "../api/accountabilityApi";

function baseResult(overrides: Partial<ResultView> = {}): ResultView {
  return {
    gameConnectionId: "gc-1",
    globalTrustScore: 74,
    conductScore: 20,
    status: "pending",
    crossGameSignals: [],
    caseHistory: [],
    auditTrail: [],
    ...overrides,
  };
}

describe("ResultsPanel", () => {
  it("always renders the global trust score prominently when a result exists", () => {
    render(<ResultsPanel result={baseResult({ globalTrustScore: 91 })} loading={false} error={null} />);

    expect(screen.getByTestId("global-trust-score")).toHaveTextContent("91");
    expect(screen.getByText(/global trust score/i)).toBeInTheDocument();
  });

  it("shows a friendly 'no records' message when conductScore is null", () => {
    render(
      <ResultsPanel
        result={baseResult({ conductScore: null, status: null })}
        loading={false}
        error={null}
      />,
    );

    expect(screen.getByTestId("no-records")).toHaveTextContent(/no records for this game/i);
    expect(screen.queryByTestId("conduct-score")).not.toBeInTheDocument();
    // Global trust score must still be visible even with no per-game record.
    expect(screen.getByTestId("global-trust-score")).toBeInTheDocument();
  });

  it("renders cross-game warnings when present", () => {
    render(
      <ResultsPanel
        result={baseResult({
          crossGameSignals: [
            { operatorId: "op-2", gameId: "game-b", confirmedOffenceCount: 3, hasActiveBan: true },
          ],
        })}
        loading={false}
        error={null}
      />,
    );

    const warnings = screen.getByTestId("cross-game-warnings");
    expect(warnings).toHaveTextContent("game-b");
    expect(warnings).toHaveTextContent("op-2");
    expect(warnings).toHaveTextContent("3");
    expect(warnings).toHaveTextContent(/active ban/i);
  });

  it("renders the case-history table with its detection source when history exists", () => {
    render(
      <ResultsPanel
        result={baseResult({
          caseHistory: [
            {
              timestamp: "2024-01-01T10:00:00Z",
              offenceType: "chatAbuse",
              source: "conductEngine",
              score: 88,
              status: "pending",
            },
          ],
        })}
        loading={false}
        error={null}
      />,
    );

    const table = screen.getByTestId("case-history");
    expect(table).toHaveTextContent("chatAbuse");
    expect(table).toHaveTextContent("88");
    expect(table).toHaveTextContent("pending");
    expect(table).toHaveTextContent(/conduct engine/i);
  });

  it("renders the audit trail with source-attributed entries when present", () => {
    render(
      <ResultsPanel
        result={baseResult({
          auditTrail: [
            {
              occurredAt: "2024-01-01T10:00:00Z",
              source: "antiCheat",
              actor: "anti-cheat:op-1",
              action: "VERDICT_CONFIRMED",
              detail: "aimbot (vendor confidence 0.97)",
            },
          ],
        })}
        loading={false}
        error={null}
      />,
    );

    const audit = screen.getByTestId("audit-trail");
    expect(audit).toHaveTextContent(/anti-cheat/i);
    expect(audit).toHaveTextContent("VERDICT_CONFIRMED");
    expect(audit).toHaveTextContent("aimbot (vendor confidence 0.97)");
  });

  it("shows an error message and no result when error is set", () => {
    render(<ResultsPanel result={null} loading={false} error="Boom" />);

    expect(screen.getByRole("alert")).toHaveTextContent("Boom");
    expect(screen.queryByTestId("global-trust-score")).not.toBeInTheDocument();
  });
});


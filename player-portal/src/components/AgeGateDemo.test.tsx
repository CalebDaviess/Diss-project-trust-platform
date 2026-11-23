import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AgeGateDemo } from "./AgeGateDemo";

/** A DOB that makes the player comfortably an adult today. */
const ADULT_DOB = "1990-01-01";
/** A DOB that makes the player ~10 years old today. */
function childDob(): string {
  const d = new Date();
  d.setFullYear(d.getFullYear() - 10);
  return d.toISOString().slice(0, 10);
}

describe("AgeGateDemo", () => {
  it("allows access when the player meets the game's minimum age", async () => {
    const user = userEvent.setup();
    render(<AgeGateDemo />);

    // Default selected game is the PEGI 18 title.
    await user.type(screen.getByLabelText(/date of birth/i), ADULT_DOB);
    await user.click(screen.getByRole("button", { name: /check access/i }));

    const verdict = screen.getByTestId("age-gate-verdict");
    expect(verdict).toHaveTextContent(/access allowed/i);
  });

  it("blocks access when the player is under the game's minimum age", async () => {
    const user = userEvent.setup();
    render(<AgeGateDemo />);

    await user.type(screen.getByLabelText(/date of birth/i), childDob());
    await user.click(screen.getByRole("button", { name: /check access/i }));

    const verdict = screen.getByTestId("age-gate-verdict");
    expect(verdict).toHaveTextContent(/access blocked/i);
  });
});


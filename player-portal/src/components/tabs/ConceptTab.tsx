import { AgeGateDemo } from "../AgeGateDemo";
import { ConceptualSections } from "../ConceptualSections";

/** The wider product story: identity, age assurance and governance — designed, not built. */
export function ConceptTab() {
  return (
    <div className="concept">
      <section className="panel panel--hint">
        <h2>Where this is heading</h2>
        <p className="muted">
          These journeys complete the end-to-end product concept. They are design placeholders —
          not wired to a live backend — shown here so the full accountability story is visible.
        </p>
      </section>
      <ConceptualSections />
      <AgeGateDemo />
    </div>
  );
}

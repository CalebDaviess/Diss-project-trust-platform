/**
 * Conceptual-only journeys. These illustrate the wider product story
 * (identity verification, age assurance, governance/appeals) but are NOT
 * wired to a live backend — they are "designed, not built".
 */
const CONCEPTUAL_SECTIONS = [
  {
    key: "identity",
    title: "Identity verification",
    blurb:
      "One verified human identity bound to the accountability record, so bans and trust follow the person, not the account.",
  },
  {
    key: "age",
    title: "Age assurance",
    blurb:
      "Privacy-preserving age checks aligned with the Online Safety Act — proving eligibility without over-collecting personal data.",
  },
  {
    key: "governance",
    title: "Governance & appeals",
    blurb:
      "A fair, transparent route to contest a decision, with human review and a documented audit trail before any lasting sanction.",
  },
];

export function ConceptualSections() {
  return (
    <section className="card conceptual" aria-labelledby="conceptual-heading">
      <h2 id="conceptual-heading">Wider journey (designed, not built)</h2>
      <p className="muted">
        These screens illustrate the end-to-end product concept. They are design
        placeholders only — no live backend.
      </p>
      <div className="conceptual__grid">
        {CONCEPTUAL_SECTIONS.map((section) => (
          <article key={section.key} className="conceptual__item">
            <h3>{section.title}</h3>
            <p>{section.blurb}</p>
            <span className="badge badge--concept">Designed, not built</span>
          </article>
        ))}
      </div>
    </section>
  );
}


import { Link } from "react-router-dom"

export default function AbsenceExcusePage() {
  return (
    <section className="placeholder-page">
      <div className="placeholder-copy">
        <p className="eyebrow">StatForm — Absence Excuse Letter</p>
        <h1>Absence Excuse Letter</h1>
        <p>
          This letter builder is coming in the next release. Return to{" "}
          <Link to="/statform" style={{ color: "var(--primary)", fontWeight: 700 }}>
            StatForm
          </Link>{" "}
          to see all available letter types.
        </p>
      </div>
    </section>
  )
}

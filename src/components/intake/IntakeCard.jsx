import { useState } from "react"

function severityClass(severity) {
  if (!severity) return ""
  const s = severity.toLowerCase().replace(/\s+/g, "-")
  return `intake-score-badge--${s}`
}

function generateSummary(intake) {
  const lines = [
    `Chief Complaint:`,
    intake.chiefComplaint || "Not provided",
    ``,
    `History:`,
    intake.currentConcerns || "Not provided",
    ``,
    `Current Medications:`,
    intake.medications || "Not provided",
    ``,
    `Previous Treatment:`,
    intake.previousTreatment || "Not provided",
    ``,
    `Previous Hospitalizations:`,
    intake.previousHospitalizations || "Not provided",
    ``,
    `PHQ-9:`,
    `${intake.phq9Score} - ${intake.phq9Severity}`,
  ]

  if (intake.phq9Q9Flag) {
    lines.push(`Positive response to PHQ-9 self-harm screening item.`)
  }

  lines.push(``, `GAD-7:`, `${intake.gad7Score} - ${intake.gad7Severity}`)

  return lines.join("\n")
}

function formatDate(ts) {
  if (!ts) return "—"
  // Firestore Timestamp object has .toDate()
  const d = ts.toDate ? ts.toDate() : new Date(ts)
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
}

export default function IntakeCard({ intake }) {
  const [showSummary, setShowSummary] = useState(false)
  const [copied, setCopied] = useState(false)

  async function handleCopy() {
    const text = generateSummary(intake)
    await navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="intake-result-card">
      {/* Q9 Safety Flag — must be impossible to miss */}
      {intake.phq9Q9Flag && (
        <div className="intake-q9-flag" role="alert">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
            <line x1="12" y1="9" x2="12" y2="13" />
            <line x1="12" y1="17" x2="12.01" y2="17" />
          </svg>
          Positive self-harm screening item — review before visit
        </div>
      )}

      <div className="intake-result-card__header">
        <div>
          <h3 className="intake-result-card__name">{intake.patientName}</h3>
          <p className="intake-result-card__date">Submitted {formatDate(intake.createdAt)}</p>
        </div>
      </div>

      {intake.chiefComplaint && (
        <p className="intake-chief-complaint">"{intake.chiefComplaint}"</p>
      )}

      <div className="intake-scores">
        <span className={`intake-score-badge ${severityClass(intake.phq9Severity)}`}>
          PHQ-9: {intake.phq9Score} — {intake.phq9Severity}
        </span>
        <span className={`intake-score-badge ${severityClass(intake.gad7Severity)}`}>
          GAD-7: {intake.gad7Score} — {intake.gad7Severity}
        </span>
      </div>

      <div className="intake-result-actions">
        <button
          type="button"
          className="intake-result-btn"
          onClick={() => setShowSummary((v) => !v)}
        >
          {showSummary ? "Hide Summary" : "Generate Summary"}
        </button>
        {showSummary && (
          <button
            type="button"
            className={`intake-result-btn intake-result-btn--copy${copied ? " intake-result-btn--copied" : ""}`}
            onClick={handleCopy}
          >
            {copied ? "Copied ✓" : "Copy Summary"}
          </button>
        )}
      </div>

      {showSummary && (
        <pre className="intake-summary-panel">{generateSummary(intake)}</pre>
      )}
    </div>
  )
}

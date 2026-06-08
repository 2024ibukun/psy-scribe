import { useState } from "react"

function severityClass(severity) {
  if (!severity) return ""
  const s = severity.toLowerCase().replace(/\s+/g, "-")
  return `intake-score-badge--${s}`
}

// ─────────────────────────────────────────────
// Summary generators — plain text only, no
// markdown, pastes cleanly into any EHR field.
// Optional fields are omitted when blank.
// ─────────────────────────────────────────────

function push(lines, label, value) {
  if (value && String(value).trim()) {
    lines.push(`${label}:`, String(value).trim(), ``)
  }
}

function generateAdultSummary(intake) {
  const lines = []

  lines.push(`Patient: ${intake.patientName || "—"}`)
  lines.push(`DOB: ${intake.dob || "—"}`)
  if (intake.pronouns)       lines.push(`Pronouns: ${intake.pronouns}`)
  if (intake.genderIdentity) lines.push(`Gender Identity: ${intake.genderIdentity}`)
  lines.push(``)

  push(lines, `Chief Complaint`,    intake.chiefComplaint)
  push(lines, `Treatment Goals`,    intake.treatmentGoals)
  push(lines, `History`,            intake.currentConcerns)
  push(lines, `Current Medications`, intake.medications)

  lines.push(`Allergies:`)
  lines.push(intake.allergies || "Not provided")
  lines.push(``)

  push(lines, `Previous Treatment`,          intake.previousTreatment)
  push(lines, `Previous Hospitalizations`,   intake.previousHospitalizations)
  push(lines, `Pharmacy`,                    intake.pharmacy)

  if (intake.emergencyContactName || intake.emergencyContactPhone) {
    lines.push(`Emergency Contact:`)
    lines.push(`${intake.emergencyContactName || "—"} - ${intake.emergencyContactPhone || "—"}`)
    lines.push(``)
  }

  lines.push(`PHQ-9:`)
  lines.push(`${intake.phq9Score} - ${intake.phq9Severity}`)
  if (intake.phq9Q9Flag) {
    lines.push(`Positive response to PHQ-9 self-harm screening item.`)
  }
  lines.push(``)
  lines.push(`GAD-7:`)
  lines.push(`${intake.gad7Score} - ${intake.gad7Severity}`)

  return lines.join("\n")
}

function generatePediatricSummary(intake) {
  const lines = []

  lines.push(`Pediatric Intake — Parent/Guardian Report`)
  lines.push(`Child: ${intake.childName || intake.patientName || "—"}`)
  lines.push(`DOB: ${intake.childDob || intake.dob || "—"}`)
  if (intake.completedBy || intake.relationshipToChild || intake.guardianName) {
    lines.push(
      `Completed by: ${intake.completedBy || "—"} (${intake.relationshipToChild || "—"}) - ${intake.guardianName || "—"}`
    )
  }
  lines.push(``)

  push(lines, `Chief Concern`,       intake.chiefConcern)
  push(lines, `History`,             intake.currentConcerns)
  push(lines, `Current Medications`, intake.medications)

  lines.push(`Allergies:`)
  lines.push(intake.allergies || "Not provided")
  lines.push(``)

  // Developmental history — only include if any value set
  const devLines = []
  if (intake.pregnancyBirthComplications) {
    let v = intake.pregnancyBirthComplications
    if (intake.pregnancyBirthComplicationsDetail) v += ` — ${intake.pregnancyBirthComplicationsDetail}`
    devLines.push(`Pregnancy/birth: ${v}`)
  }
  if (intake.milestones) {
    let v = intake.milestones
    if (intake.milestonesDetail) v += ` — ${intake.milestonesDetail}`
    devLines.push(`Milestones: ${v}`)
  }
  if (intake.earlyInterventionDiagnoses) {
    let v = intake.earlyInterventionDiagnoses
    if (intake.earlyInterventionDiagnosesDetail) v += ` — ${intake.earlyInterventionDiagnosesDetail}`
    devLines.push(`Early intervention/diagnoses: ${v}`)
  }
  if (devLines.length > 0) {
    lines.push(`Developmental History:`)
    devLines.forEach((l) => lines.push(l))
    lines.push(``)
  }

  // School
  const schoolLines = []
  if (intake.grade || intake.schoolName) {
    schoolLines.push(`Grade ${intake.grade || "—"}, ${intake.schoolName || "—"}`)
  }
  if (intake.iep504)             schoolLines.push(`IEP/504: ${intake.iep504}`)
  if (intake.academicPerformance) schoolLines.push(`Academic performance: ${intake.academicPerformance}`)
  if (intake.schoolBehaviorConcerns) schoolLines.push(`School behavior: ${intake.schoolBehaviorConcerns}`)
  if (schoolLines.length > 0) {
    lines.push(`School:`)
    schoolLines.forEach((l) => lines.push(l))
    lines.push(``)
  }

  // PHQ-A
  lines.push(`PHQ-A (parent report):`)
  lines.push(`${intake.phqaScore} - ${intake.phqaSeverity}`)
  if (intake.phqaItem9Flag) {
    lines.push(`Positive response to PHQ-A self-harm screening item.`)
  }
  lines.push(``)

  // SCARED
  lines.push(`SCARED (parent report, 5-item abbreviated screen):`)
  lines.push(`${intake.scaredScore} - ${intake.scaredInterpretation}`)
  lines.push(``)

  if (intake.emergencyContactName || intake.emergencyContactPhone) {
    lines.push(`Emergency Contact:`)
    lines.push(`${intake.emergencyContactName || "—"} - ${intake.emergencyContactPhone || "—"}`)
  }

  return lines.join("\n")
}

function generateSummary(intake) {
  return intake.intakeType === "pediatric"
    ? generatePediatricSummary(intake)
    : generateAdultSummary(intake)
}

function formatDate(ts) {
  if (!ts) return "—"
  const d = ts.toDate ? ts.toDate() : new Date(ts)
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
}

// Warning triangle icon (reused for both adult Q9 and pediatric PHQA item-9)
function WarnIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
      <line x1="12" y1="9" x2="12" y2="13" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  )
}

export default function IntakeCard({ intake, onMarkReviewed, onDelete }) {
  const [showSummary,  setShowSummary]  = useState(false)
  const [copied,       setCopied]       = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  const isPediatric = intake.intakeType === "pediatric"
  const isReviewed  = intake.status === "reviewed"

  // Safety flag fires for adult Q9 OR pediatric PHQA item 9
  const hasSafetyFlag = intake.phq9Q9Flag || intake.phqaItem9Flag

  async function handleCopy() {
    const text = generateSummary(intake)
    await navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className={`intake-result-card${isReviewed ? " intake-result-card--reviewed" : ""}`}>

      {/* Safety flag — same prominent red alert for both adult and pediatric */}
      {hasSafetyFlag && (
        <div className="intake-q9-flag" role="alert">
          <WarnIcon />
          Positive self-harm screening item — review before visit
        </div>
      )}

      {/* Card header */}
      <div className="intake-result-card__header">
        <div>
          {/* Intake type badge */}
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "2px" }}>
            <h3 className="intake-result-card__name">
              {isPediatric ? (intake.childName || intake.patientName) : intake.patientName}
            </h3>
            <span className={`intake-type-badge intake-type-badge--${isPediatric ? "pediatric" : "adult"}`}>
              {isPediatric ? "Pediatric" : "Adult"}
            </span>
          </div>
          <p className="intake-result-card__date">Submitted {formatDate(intake.createdAt)}</p>
          {/* Guardian line for pediatric */}
          {isPediatric && intake.guardianName && (
            <p className="intake-guardian-line">
              Guardian: {intake.guardianName}
              {intake.relationshipToChild ? ` (${intake.relationshipToChild})` : ""}
            </p>
          )}
        </div>
        {isReviewed && <span className="intake-reviewed-badge">✓ Reviewed</span>}
      </div>

      {/* Chief concern / complaint */}
      {(intake.chiefComplaint || intake.chiefConcern) && (
        <p className="intake-chief-complaint">
          "{intake.chiefConcern || intake.chiefComplaint}"
        </p>
      )}

      {/* Scores */}
      <div className="intake-scores">
        {isPediatric ? (
          <>
            {intake.phqaSeverity && (
              <span className={`intake-score-badge ${severityClass(intake.phqaSeverity)}`}>
                PHQ-A: {intake.phqaScore} — {intake.phqaSeverity}
              </span>
            )}
            {intake.scaredInterpretation && (
              <span className={`intake-score-badge ${intake.scaredScore >= 3 ? "intake-score-badge--moderate" : "intake-score-badge--mild"}`}>
                SCARED: {intake.scaredScore}/10
              </span>
            )}
          </>
        ) : (
          <>
            {intake.phq9Severity && (
              <span className={`intake-score-badge ${severityClass(intake.phq9Severity)}`}>
                PHQ-9: {intake.phq9Score} — {intake.phq9Severity}
              </span>
            )}
            {intake.gad7Severity && (
              <span className={`intake-score-badge ${severityClass(intake.gad7Severity)}`}>
                GAD-7: {intake.gad7Score} — {intake.gad7Severity}
              </span>
            )}
          </>
        )}
      </div>

      {/* Actions */}
      <div className="intake-result-actions">
        <button type="button" className="intake-result-btn"
          onClick={() => setShowSummary((v) => !v)}>
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

        {!isReviewed && onMarkReviewed && (
          <button type="button" className="intake-result-btn intake-result-btn--reviewed"
            onClick={() => onMarkReviewed(intake.id)}>
            Mark as Reviewed
          </button>
        )}

        {onDelete && !confirmDelete && (
          <button type="button" className="intake-result-btn intake-result-btn--delete"
            onClick={() => setConfirmDelete(true)}>
            Delete
          </button>
        )}
      </div>

      {/* Delete confirmation */}
      {confirmDelete && (
        <div className="intake-delete-confirm" role="alertdialog">
          <p>
            Delete this intake permanently? This cannot be undone.
            Make sure you have copied the information to your EMR.
          </p>
          <div className="intake-delete-actions">
            <button type="button" className="intake-delete-btn"
              onClick={() => onDelete(intake.id, intake.token)}>
              Delete permanently
            </button>
            <button type="button" className="intake-cancel-btn"
              onClick={() => setConfirmDelete(false)}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {showSummary && (
        <pre className="intake-summary-panel">{generateSummary(intake)}</pre>
      )}
    </div>
  )
}

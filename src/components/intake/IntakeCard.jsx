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

// Pretty names used in both summary and card display for follow-up scale results
const FOLLOWUP_SCALE_LABELS = {
  phq9:    "PHQ-9",
  gad7:    "GAD-7",
  phqa:    "PHQ-A",
  scared:  "SCARED-5",
  scared5: "SCARED-5",
}

function generateFollowUpSummary(intake) {
  const lines = []
  const submittedOn = formatDate(intake.createdAt)

  lines.push("Follow-Up Visit Check-In")
  lines.push(`Patient: ${intake.patientName || "—"}`)
  lines.push(`DOB: ${intake.dob || "—"}`)
  lines.push(`Date: ${submittedOn}`)
  lines.push("")

  lines.push("Visit Focus:")
  lines.push(intake.visitReason || "—")
  lines.push("")

  lines.push("Interval Safety:")
  const erStr = intake.erOrHospitalSince === true ? "Yes" : intake.erOrHospitalSince === false ? "No" : "—"
  if (intake.erOrHospitalSince === true && intake.erOrHospitalDetail) {
    lines.push(`ER or hospitalization since last visit: Yes — ${intake.erOrHospitalDetail}`)
  } else {
    lines.push(`ER or hospitalization since last visit: ${erStr}`)
  }
  const safetyStr = intake.safetyFlag === true ? "Yes" : intake.safetyFlag === false ? "No" : "—"
  lines.push(`Safety concerns: ${safetyStr}`)
  if (intake.safetyFlag === true) {
    lines.push("⚠ SAFETY CONCERN REPORTED — review before visit")
  }
  lines.push("")

  lines.push("Symptom Update:")
  lines.push(`Overall: ${intake.symptomOverall || "—"}`)
  lines.push(`Sleep: ${intake.symptomSleep || "—"}`)
  lines.push(`Appetite: ${intake.symptomAppetite || "—"}`)
  lines.push("")

  lines.push("Medications:")
  const medStr = intake.medicationChanges === true ? "Yes" : intake.medicationChanges === false ? "No" : "—"
  lines.push(`Changes since last visit: ${medStr}`)
  if (intake.medicationChanges === true && intake.medicationChangeDetail) {
    lines.push(`Change detail: ${intake.medicationChangeDetail}`)
  }
  lines.push(`Adherence: ${intake.medicationAdherence || "—"}`)
  lines.push(`Side effects: ${intake.sideEffects || "—"}`)
  if ((intake.sideEffects === "Moderate" || intake.sideEffects === "Severe") && intake.sideEffectDetail) {
    lines.push(`Detail: ${intake.sideEffectDetail}`)
  }
  lines.push("")

  lines.push("Therapy:")
  lines.push(intake.therapyStatus || "—")

  const results = intake.scaleResults || {}
  const completedIds = Object.keys(results)
  if (completedIds.length > 0) {
    lines.push("")
    lines.push("Assessments:")
    completedIds.forEach((id) => {
      const r = results[id]
      const label    = FOLLOWUP_SCALE_LABELS[id] || id.toUpperCase()
      const scoreStr = r.score !== undefined ? r.score : "—"
      const sevStr   = r.severity || r.interpretation || "—"
      lines.push(`${label}: ${scoreStr} — ${sevStr}`)
      if (id === "phq9"  && r.phq9Q9Flag)    lines.push("Positive response to PHQ-9 self-harm screening item.")
      if (id === "phqa"  && r.phqaItem9Flag) lines.push("Positive response to PHQ-A self-harm screening item.")
    })
  }

  if (intake.anythingElse && intake.anythingElse.trim()) {
    lines.push("")
    lines.push("Additional Notes:")
    lines.push(intake.anythingElse.trim())
  }

  return lines.join("\n")
}

function generateSummary(intake) {
  if (intake.intakeType === "followup")  return generateFollowUpSummary(intake)
  if (intake.intakeType === "pediatric") return generatePediatricSummary(intake)
  return generateAdultSummary(intake)
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

  const isFollowUp  = intake.intakeType === "followup"
  const isPediatric = isFollowUp
    ? intake.patientType === "pediatric"
    : intake.intakeType === "pediatric"
  const isReviewed  = intake.status === "reviewed"

  // Safety flag: adult Q9, pediatric PHQA item 9, or follow-up safetyFlag
  const hasSafetyFlag = intake.phq9Q9Flag || intake.phqaItem9Flag || intake.safetyFlag === true

  async function handleCopy() {
    const text = generateSummary(intake)
    await navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className={`intake-result-card${isReviewed ? " intake-result-card--reviewed" : ""}`}>

      {/* Safety flag — red alert for self-harm screening (adult Q9, pediatric PHQA item 9, follow-up safetyFlag) */}
      {hasSafetyFlag && (
        <div className="intake-q9-flag" role="alert">
          <WarnIcon />
          {isFollowUp
            ? "Safety concern reported — review before visit"
            : "Positive self-harm screening item — review before visit"}
        </div>
      )}

      {/* ER / hospitalization warning — follow-up only */}
      {isFollowUp && intake.erOrHospitalSince === true && (
        <div className="intake-fu-er-warning" role="alert">
          <WarnIcon />
          ER or hospitalization reported since last visit
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
            {isFollowUp ? (
              <>
                <span className="intake-type-badge intake-type-badge--followup">Follow-Up</span>
                <span className={`intake-type-badge intake-type-badge--${isPediatric ? "pediatric" : "adult"}`}>
                  {isPediatric ? "Pediatric" : "Adult"}
                </span>
              </>
            ) : (
              <span className={`intake-type-badge intake-type-badge--${isPediatric ? "pediatric" : "adult"}`}>
                {isPediatric ? "Pediatric" : "Adult"}
              </span>
            )}
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

      {/* Scores — always visible at a glance */}
      <div className="intake-scores">
        {isFollowUp ? (
          // Follow-up scale results are stored nested in scaleResults object
          Object.entries(intake.scaleResults || {}).map(([id, r]) => {
            const label   = FOLLOWUP_SCALE_LABELS[id] || id.toUpperCase()
            const score   = r.score
            const sev     = r.severity || r.interpretation
            if (score === undefined || !sev) return null
            return (
              <span key={id} className={`intake-score-badge ${severityClass(sev)}`}>
                {label}: {score} — {sev}
              </span>
            )
          })
        ) : isPediatric ? (
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
          {showSummary ? "Hide Summary" : "Show Summary"}
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
        <>
          {/* Chief concern / complaint — new patient only */}
          {!isFollowUp && (intake.chiefComplaint || intake.chiefConcern) && (
            <p className="intake-chief-complaint">
              "{intake.chiefConcern || intake.chiefComplaint}"
            </p>
          )}

          {/* Follow-up summary fields */}
          {isFollowUp && (
            <div className="intake-fu-summary">
              {intake.visitReason && (
                <p className="intake-fu-row">
                  <span className="intake-fu-label">Focus:</span> {intake.visitReason}
                </p>
              )}
              {intake.symptomOverall && (
                <p className="intake-fu-row">
                  <span className="intake-fu-label">Symptoms:</span> {intake.symptomOverall}
                </p>
              )}
              {intake.medicationAdherence && (
                <p className="intake-fu-row">
                  <span className="intake-fu-label">Medications:</span> {intake.medicationAdherence}
                </p>
              )}
            </div>
          )}

          <pre className="intake-summary-panel">{generateSummary(intake)}</pre>
        </>
      )}
    </div>
  )
}

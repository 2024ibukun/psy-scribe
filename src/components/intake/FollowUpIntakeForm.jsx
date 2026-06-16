import { useState } from "react"
import {
  doc,
  addDoc,
  updateDoc,
  collection,
  serverTimestamp,
} from "firebase/firestore"
import { db } from "../../firebase"
import ClinicIdentityBanner from "./ClinicIdentityBanner"
import PHQ9   from "../scales/PHQ9"
import GAD7   from "../scales/GAD7"
import PHQA   from "../scales/PHQA"
import SCARED from "../scales/SCARED"

// ── Scale registry ────────────────────────────────────────────────────────────
// "scared5" is the ID stored by SmartIntakePage Part 1; "scared" is the spec alias.
const SCALE_COMPONENTS = {
  phq9:    PHQ9,
  gad7:    GAD7,
  phqa:    PHQA,
  scared:  SCARED,
  scared5: SCARED,
}

const COMING_SOON_LABELS = {
  pcl5:   "PCL-5 — Coming Soon",
  auditc: "AUDIT-C — Coming Soon",
  crafft: "CRAFFT — Coming Soon",
}

// ── Sub-components ────────────────────────────────────────────────────────────

function Section({ title, children }) {
  return (
    <div className="intake-card" style={{ marginBottom: "16px" }}>
      <h2 className="intake-section-title">{title}</h2>
      {children}
    </div>
  )
}

function ChipGroup({ id, options, value, onChange, error }) {
  return (
    <div id={id}>
      <div className="intake-chips" role="group">
        {options.map((opt) => (
          <button
            key={String(opt.value)}
            type="button"
            className={`intake-chip${value === opt.value ? " intake-chip--selected" : ""}`}
            onClick={() => onChange(opt.value)}
            aria-pressed={value === opt.value}
          >
            {opt.label}
          </button>
        ))}
      </div>
      {error && <p className="intake-field-error" role="alert">{error}</p>}
    </div>
  )
}

function clearError(setFieldErrors, key) {
  setFieldErrors((prev) => {
    const next = { ...prev }
    delete next[key]
    return next
  })
}

// Local-time DOB parsing to avoid UTC-midnight off-by-one (see CLAUDE.md)
function calcPatientAge(dobStr) {
  if (!dobStr) return null
  const [y, m, d] = dobStr.split("-").map(Number)
  const born = new Date(y, m - 1, d)
  const today = new Date()
  let age = today.getFullYear() - born.getFullYear()
  const mDiff = today.getMonth() - born.getMonth()
  if (mDiff < 0 || (mDiff === 0 && today.getDate() < born.getDate())) age--
  return age
}

// ── Main component ────────────────────────────────────────────────────────────

export default function FollowUpIntakeForm({ token, clinicianProfile }) {
  // Use parent/guardian language when patient is under 14
  const patientAgeYears = calcPatientAge(token.dob)
  const p = patientAgeYears !== null && patientAgeYears < 14

  // Section 1 — Visit Reason
  const [visitReason, setVisitReason] = useState("")

  // Section 2 — Interval Safety
  const [erOrHospitalSince,  setErOrHospitalSince]  = useState(null)
  const [erOrHospitalDetail, setErOrHospitalDetail] = useState("")
  const [safetyFlag,         setSafetyFlag]         = useState(null)

  // Section 3 — Symptoms
  const [symptomOverall,  setSymptomOverall]  = useState("")
  const [symptomSleep,    setSymptomSleep]    = useState("")
  const [symptomAppetite, setSymptomAppetite] = useState("")

  // Section 4 — Medications
  const [medicationChanges,      setMedicationChanges]      = useState(null)
  const [medicationChangeDetail, setMedicationChangeDetail] = useState("")
  const [medicationAdherence,    setMedicationAdherence]    = useState("")
  const [sideEffects,            setSideEffects]            = useState("")
  const [sideEffectDetail,       setSideEffectDetail]       = useState("")

  // Section 5 — Therapy
  const [therapyStatus, setTherapyStatus] = useState("")

  // Section 6 — Scale results (keyed by scale ID, optional)
  const [scaleResults, setScaleResults] = useState({})

  // Section 7 — Anything Else
  const [anythingElse, setAnythingElse] = useState("")

  // Submission
  const [fieldErrors, setFieldErrors] = useState({})
  const [submitting,  setSubmitting]  = useState(false)
  const [submitted,   setSubmitted]   = useState(false)
  const [submitError, setSubmitError] = useState(false)

  function handleScaleComplete(scaleId, data) {
    setScaleResults((prev) => ({ ...prev, [scaleId]: data }))
  }

  // ── Validation ──────────────────────────────────────────────────────────────
  function validate() {
    const errors = {}
    if (!visitReason.trim())        errors.visitReason        = "Please describe what you'd like to focus on."
    if (erOrHospitalSince === null) errors.erOrHospitalSince  = "Please select Yes or No."
    if (safetyFlag === null)        errors.safetyFlag         = "Please select Yes or No."
    if (!symptomOverall)            errors.symptomOverall     = "Please select an option."
    if (!symptomSleep)              errors.symptomSleep       = "Please select an option."
    if (!symptomAppetite)           errors.symptomAppetite    = "Please select an option."
    if (medicationChanges === null) errors.medicationChanges  = "Please select Yes or No."
    if (!medicationAdherence)       errors.medicationAdherence = "Please select an option."
    if (!sideEffects)               errors.sideEffects        = "Please select an option."
    if (!therapyStatus)             errors.therapyStatus      = "Please select an option."
    return errors
  }

  // ── Submission ──────────────────────────────────────────────────────────────
  async function handleSubmit(e) {
    if (e) e.preventDefault()
    const errors = validate()
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors)
      const firstKey = Object.keys(errors)[0]
      document.getElementById(firstKey)?.scrollIntoView({ behavior: "smooth", block: "center" })
      return
    }
    setFieldErrors({})
    setSubmitting(true)
    setSubmitError(false)
    try {
      await addDoc(collection(db, "pending_intakes"), {
        token:                 token.token,
        clinicianId:           token.clinicianId,
        patientName:           token.patientName,
        dob:                   token.dob,
        intakeType:            "followup",
        patientType:           token.intakeType || "adult",
        visitReason:           visitReason.trim(),
        erOrHospitalSince,
        erOrHospitalDetail:    erOrHospitalDetail.trim(),
        safetyFlag,
        symptomOverall,
        symptomSleep,
        symptomAppetite,
        medicationChanges,
        medicationChangeDetail: medicationChangeDetail.trim(),
        medicationAdherence,
        sideEffects,
        sideEffectDetail:      sideEffectDetail.trim(),
        therapyStatus,
        selectedScales:        token.selectedScales || [],
        scaleResults,
        anythingElse:          anythingElse.trim(),
        status:                "completed",
        createdAt:             serverTimestamp(),
      })

      // Best-effort token status update — patient is unauthenticated
      updateDoc(doc(db, "intakeTokens", token.token), { status: "completed" }).catch(
        (e) => console.warn("[FollowUpIntakeForm] Token update (non-fatal):", e?.code)
      )

      setSubmitted(true)
    } catch (err) {
      console.error("[FollowUpIntakeForm] Submit failed:", err?.code, err)
      setSubmitError(true)
    } finally {
      setSubmitting(false)
    }
  }

  // ── Early-exit screens ──────────────────────────────────────────────────────
  if (submitted) {
    return (
      <div className="intake-card intake-done">
        <div className="intake-done-check" aria-hidden="true">✓</div>
        <h2 className="intake-title" style={{ marginBottom: "10px" }}>Thank you.</h2>
        <p className="intake-subtitle">
          Your information has been sent to your clinician. You may close this page.
        </p>
      </div>
    )
  }

  if (submitting) {
    return (
      <div className="intake-card" style={{ textAlign: "center", padding: "48px" }}>
        <p className="intake-subtitle">Submitting your form…</p>
      </div>
    )
  }

  if (submitError) {
    return (
      <div className="intake-card" style={{ textAlign: "center" }}>
        <h2 className="intake-title">Submission error</h2>
        <p className="intake-subtitle">
          Your answers are saved. Please tap the button below to try again.
          Do not refresh this page.
        </p>
        <button
          type="button"
          className="intake-primary-btn"
          onClick={handleSubmit}
          style={{ marginTop: "8px" }}
        >
          Try Again
        </button>
      </div>
    )
  }

  // ── Form render ─────────────────────────────────────────────────────────────
  const scales    = token.selectedScales || []
  const hasScales = scales.length > 0
  const hasErrors = Object.keys(fieldErrors).length > 0

  return (
    <form onSubmit={handleSubmit} noValidate>

      {/* Clinic identity — shows clinic name/clinician before patient fills anything */}
      <ClinicIdentityBanner profile={clinicianProfile} />

      {/* Header */}
      <div className="intake-card">
        <h1 className="intake-title">Follow-Up Visit Check-In</h1>
        <p className="intake-subtitle">
          This short form helps your clinician prepare for today's visit.
          It takes about 3 minutes.
        </p>
      </div>

      {/* ── Section 1 — Visit Reason ─────────────────────────────────────── */}
      <Section title="Today's Visit">
        <div className="intake-field">
          <label className="intake-label" htmlFor="fu-visit-reason">
            {p ? "What would you like to focus on during your child's visit today?" : "What would you like to focus on during today's visit?"}
            <span className="intake-label-required" aria-hidden="true"> *</span>
          </label>
          <textarea
            id="fu-visit-reason"
            className={`intake-textarea${fieldErrors.visitReason ? " intake-input--error" : ""}`}
            value={visitReason}
            onChange={(e) => {
              setVisitReason(e.target.value)
              if (fieldErrors.visitReason) clearError(setFieldErrors, "visitReason")
            }}
            placeholder="What's on your mind for today's appointment?"
            rows={3}
          />
          <div id="visitReason" />
          {fieldErrors.visitReason && (
            <p className="intake-field-error" role="alert">{fieldErrors.visitReason}</p>
          )}
        </div>
      </Section>

      {/* ── Section 2 — Interval Safety ──────────────────────────────────── */}
      <Section title={p ? "Since your child's last appointment..." : "Since your last appointment"}>

        {/* Q1 — ER / Hospitalization */}
        <div className="intake-field">
          <p className="intake-label">
            {p ? "Has your child been to an emergency room or been hospitalized for any reason?" : "Have you been to an emergency room or been hospitalized for any reason?"}
            <span className="intake-label-required" aria-hidden="true"> *</span>
          </p>
          <ChipGroup
            id="erOrHospitalSince"
            options={[
              { label: "No",  value: false },
              { label: "Yes", value: true  },
            ]}
            value={erOrHospitalSince}
            onChange={(v) => {
              setErOrHospitalSince(v)
              if (fieldErrors.erOrHospitalSince) clearError(setFieldErrors, "erOrHospitalSince")
            }}
            error={fieldErrors.erOrHospitalSince}
          />
          {erOrHospitalSince === true && (
            <div className="intake-field" style={{ marginTop: "12px" }}>
              <label className="intake-label" htmlFor="fu-er-detail">
                Please briefly describe what happened
              </label>
              <input
                id="fu-er-detail"
                type="text"
                className="intake-input"
                value={erOrHospitalDetail}
                onChange={(e) => setErOrHospitalDetail(e.target.value)}
                placeholder="Brief description"
                autoComplete="off"
              />
            </div>
          )}
        </div>

        {/* Q2 — Safety (silent flag — no crisis message shown to patient) */}
        <div className="intake-field" style={{ marginTop: "20px" }}>
          <p className="intake-label">
            {p ? "Has your child had any thoughts of hurting themselves or others?" : "Have you had any thoughts of hurting yourself or others?"}
            <span className="intake-label-required" aria-hidden="true"> *</span>
          </p>
          <ChipGroup
            id="safetyFlag"
            options={[
              { label: "No",  value: false },
              { label: "Yes", value: true  },
            ]}
            value={safetyFlag}
            onChange={(v) => {
              setSafetyFlag(v)
              if (fieldErrors.safetyFlag) clearError(setFieldErrors, "safetyFlag")
            }}
            error={fieldErrors.safetyFlag}
          />
        </div>
      </Section>

      {/* ── Section 3 — Symptoms ─────────────────────────────────────────── */}
      <Section title={p ? "How has your child been since their last visit?" : "How have you been since your last visit?"}>

        <div className="intake-field">
          <p className="intake-label">
            {p ? "Overall, how have your child's symptoms been?" : "Overall, how have your symptoms been?"}
            <span className="intake-label-required" aria-hidden="true"> *</span>
          </p>
          <ChipGroup
            id="symptomOverall"
            options={[
              { label: "Much better",    value: "Much better" },
              { label: "Better",         value: "Better" },
              { label: "About the same", value: "About the same" },
              { label: "Worse",          value: "Worse" },
              { label: "Much worse",     value: "Much worse" },
            ]}
            value={symptomOverall}
            onChange={(v) => {
              setSymptomOverall(v)
              if (fieldErrors.symptomOverall) clearError(setFieldErrors, "symptomOverall")
            }}
            error={fieldErrors.symptomOverall}
          />
        </div>

        <div className="intake-field" style={{ marginTop: "20px" }}>
          <p className="intake-label">
            {p ? "How has your child's sleep been?" : "How has your sleep been?"}
            <span className="intake-label-required" aria-hidden="true"> *</span>
          </p>
          <ChipGroup
            id="symptomSleep"
            options={[
              { label: "Good", value: "Good" },
              { label: "Fair", value: "Fair" },
              { label: "Poor", value: "Poor" },
            ]}
            value={symptomSleep}
            onChange={(v) => {
              setSymptomSleep(v)
              if (fieldErrors.symptomSleep) clearError(setFieldErrors, "symptomSleep")
            }}
            error={fieldErrors.symptomSleep}
          />
        </div>

        <div className="intake-field" style={{ marginTop: "20px" }}>
          <p className="intake-label">
            {p ? "How has your child's appetite been?" : "How has your appetite been?"}
            <span className="intake-label-required" aria-hidden="true"> *</span>
          </p>
          <ChipGroup
            id="symptomAppetite"
            options={[
              { label: "Good", value: "Good" },
              { label: "Fair", value: "Fair" },
              { label: "Poor", value: "Poor" },
            ]}
            value={symptomAppetite}
            onChange={(v) => {
              setSymptomAppetite(v)
              if (fieldErrors.symptomAppetite) clearError(setFieldErrors, "symptomAppetite")
            }}
            error={fieldErrors.symptomAppetite}
          />
        </div>
      </Section>

      {/* ── Section 4 — Medications ──────────────────────────────────────── */}
      <Section title="Medications">

        <div className="intake-field">
          <p className="intake-label">
            {p ? "Have there been any changes to your child's medications since their last visit?" : "Have there been any changes to your medications since your last visit?"}
            <span className="intake-label-required" aria-hidden="true"> *</span>
          </p>
          <ChipGroup
            id="medicationChanges"
            options={[
              { label: "No",  value: false },
              { label: "Yes", value: true  },
            ]}
            value={medicationChanges}
            onChange={(v) => {
              setMedicationChanges(v)
              if (fieldErrors.medicationChanges) clearError(setFieldErrors, "medicationChanges")
            }}
            error={fieldErrors.medicationChanges}
          />
          {medicationChanges === true && (
            <div className="intake-field" style={{ marginTop: "12px" }}>
              <label className="intake-label" htmlFor="fu-med-change">
                What changed?
              </label>
              <input
                id="fu-med-change"
                type="text"
                className="intake-input"
                value={medicationChangeDetail}
                onChange={(e) => setMedicationChangeDetail(e.target.value)}
                placeholder="Briefly describe the change"
                autoComplete="off"
              />
            </div>
          )}
        </div>

        <div className="intake-field" style={{ marginTop: "20px" }}>
          <p className="intake-label">
            {p ? "How often has your child been taking their medications as prescribed?" : "How often have you been taking your medications as prescribed?"}
            <span className="intake-label-required" aria-hidden="true"> *</span>
          </p>
          <ChipGroup
            id="medicationAdherence"
            options={[
              { label: "Always",           value: "Always" },
              { label: "Most of the time", value: "Most of the time" },
              { label: "Sometimes",        value: "Sometimes" },
              { label: "Rarely",           value: "Rarely" },
              { label: "Not taking them",  value: "Not taking them" },
            ]}
            value={medicationAdherence}
            onChange={(v) => {
              setMedicationAdherence(v)
              if (fieldErrors.medicationAdherence) clearError(setFieldErrors, "medicationAdherence")
            }}
            error={fieldErrors.medicationAdherence}
          />
        </div>

        <div className="intake-field" style={{ marginTop: "20px" }}>
          <p className="intake-label">
            {p ? "Has your child experienced any side effects from their medications?" : "Have you experienced any side effects from your medications?"}
            <span className="intake-label-required" aria-hidden="true"> *</span>
          </p>
          <ChipGroup
            id="sideEffects"
            options={[
              { label: "None",     value: "None" },
              { label: "Mild",     value: "Mild" },
              { label: "Moderate", value: "Moderate" },
              { label: "Severe",   value: "Severe" },
            ]}
            value={sideEffects}
            onChange={(v) => {
              setSideEffects(v)
              if (fieldErrors.sideEffects) clearError(setFieldErrors, "sideEffects")
            }}
            error={fieldErrors.sideEffects}
          />
          {(sideEffects === "Moderate" || sideEffects === "Severe") && (
            <div className="intake-field" style={{ marginTop: "12px" }}>
              <label className="intake-label" htmlFor="fu-side-effect">
                Please describe
              </label>
              <input
                id="fu-side-effect"
                type="text"
                className="intake-input"
                value={sideEffectDetail}
                onChange={(e) => setSideEffectDetail(e.target.value)}
                placeholder="Brief description"
                autoComplete="off"
              />
            </div>
          )}
        </div>
      </Section>

      {/* ── Section 5 — Therapy ──────────────────────────────────────────── */}
      <Section title="Therapy and Support">
        <div className="intake-field">
          <p className="intake-label">
            {p ? "Is your child currently attending therapy or counseling?" : "Are you currently attending therapy or counseling?"}
            <span className="intake-label-required" aria-hidden="true"> *</span>
          </p>
          <ChipGroup
            id="therapyStatus"
            options={[
              { label: "Yes, regularly",    value: "Yes, regularly" },
              { label: "Yes, occasionally", value: "Yes, occasionally" },
              { label: "No",                value: "No" },
            ]}
            value={therapyStatus}
            onChange={(v) => {
              setTherapyStatus(v)
              if (fieldErrors.therapyStatus) clearError(setFieldErrors, "therapyStatus")
            }}
            error={fieldErrors.therapyStatus}
          />
        </div>
      </Section>

      {/* ── Section 6 — Optional Scales (only if clinician selected any) ─── */}
      {hasScales && (
        <div className="intake-card" style={{ marginBottom: "16px" }}>
          <h2 className="intake-section-title">Assessments</h2>
          <p className="intake-subtitle" style={{ marginTop: 0, marginBottom: "24px" }}>
            Your clinician has included the following for this visit.
          </p>
          {scales.map((scaleId) => {
            const ScaleComponent = SCALE_COMPONENTS[scaleId]
            if (ScaleComponent) {
              const isComplete = Boolean(scaleResults[scaleId])
              return (
                <div key={scaleId} style={{ marginBottom: "24px" }}>
                  <ScaleComponent
                    onComplete={(data) => handleScaleComplete(scaleId, data)}
                    continueLabel={isComplete ? "✓ Saved" : "Save Responses"}
                  />
                </div>
              )
            }
            if (COMING_SOON_LABELS[scaleId]) {
              return (
                <div
                  key={scaleId}
                  className="intake-card"
                  style={{ marginBottom: "12px", textAlign: "center", opacity: 0.6 }}
                >
                  <p className="intake-subtitle" style={{ margin: 0 }}>
                    {COMING_SOON_LABELS[scaleId]}
                  </p>
                </div>
              )
            }
            return null
          })}
        </div>
      )}

      {/* ── Section 7 — Anything Else ────────────────────────────────────── */}
      <Section title="Anything else?">
        <div className="intake-field">
          <label className="intake-label" htmlFor="fu-anything-else">
            {p ? "Is there anything else you would like the clinician to know about your child before the visit?" : "Is there anything else you would like your clinician to know before your visit?"}{" "}
            <span className="intake-label-optional">(optional)</span>
          </label>
          <textarea
            id="fu-anything-else"
            className="intake-textarea"
            value={anythingElse}
            onChange={(e) => setAnythingElse(e.target.value)}
            placeholder="Any updates, concerns, or questions you want to make sure we address"
            rows={3}
          />
        </div>
      </Section>

      {hasErrors && (
        <p className="intake-error" role="alert" style={{ marginBottom: "12px" }}>
          Please complete all required fields marked above before submitting.
        </p>
      )}

      <button type="submit" className="intake-primary-btn" disabled={submitting}>
        Submit Check-In →
      </button>
    </form>
  )
}

import { useState, useEffect, useCallback } from "react"
import { useParams } from "react-router-dom"
import {
  doc,
  getDoc,
  addDoc,
  updateDoc,
  collection,
  serverTimestamp,
} from "firebase/firestore"
import { db } from "../../firebase"
import PHQ9 from "../scales/PHQ9"
import GAD7 from "../scales/GAD7"

// ─────────────────────────────────────────────
// Intake form configuration — config-driven so
// a pediatric version (guardian fields, school,
// developmental history) can be added in Phase 4
// without rebuilding the renderer.
//
// Field types: text | date | tel | email | textarea | chips
// chips fields have an options array; options with
// freeText: true show a free-text input when selected.
// ─────────────────────────────────────────────
const INTAKE_CONFIG = {
  adult: {
    type: "adult",
    patientFields: [
      { id: "fullName",      label: "Full Name",             type: "text",  required: true },
      { id: "dob",           label: "Date of Birth",         type: "date",  required: true, readOnly: true },
      { id: "preferredName", label: "Preferred Name (Optional)", type: "text" },
      { id: "phone",         label: "Phone Number",          type: "tel" },
      { id: "email",         label: "Email Address",         type: "email" },
      {
        id: "genderIdentity",
        label: "Gender identity (optional)",
        type: "chips",
        required: false,
        options: [
          { label: "Woman",                    value: "Woman" },
          { label: "Man",                      value: "Man" },
          { label: "Non-binary",               value: "Non-binary" },
          { label: "Prefer to self-describe",  value: "_self", freeText: true },
          { label: "Prefer not to say",        value: "Prefer not to say" },
        ],
      },
      {
        id: "pronouns",
        label: "Pronouns (optional)",
        type: "chips",
        required: false,
        options: [
          { label: "she/her",         value: "she/her" },
          { label: "he/him",          value: "he/him" },
          { label: "they/them",       value: "they/them" },
          { label: "Other",           value: "_other", freeText: true },
          { label: "Prefer not to say", value: "Prefer not to say" },
        ],
      },
      {
        id: "allergies",
        label: "Allergies (medications, food, other)",
        type: "text",
        required: true,
        placeholder: "e.g. Penicillin, shellfish — or enter: None known",
        helper: 'Enter "None known" if you have no known allergies.',
        errorMessage: 'Please list your allergies, or enter "None known".',
      },
      {
        id: "emergencyContactName",
        label: "Emergency contact name",
        type: "text",
        required: true,
        placeholder: "Full name",
        errorMessage: "Please enter an emergency contact name.",
      },
      {
        id: "emergencyContactPhone",
        label: "Emergency contact phone",
        type: "tel",
        required: true,
        placeholder: "Phone number",
        errorMessage: "Please enter an emergency contact phone number.",
      },
    ],
    clinicalFields: [
      {
        id: "chiefComplaint",
        label: "Chief Complaint",
        type: "text",
        placeholder: "What brings you in today?",
      },
      {
        id: "treatmentGoals",
        label: "What are you hoping to get help with? (optional)",
        type: "textarea",
        placeholder: "Describe what you would like to work on.",
      },
      {
        id: "currentConcerns",
        label: "Current Psychiatric Concerns",
        type: "textarea",
        placeholder: "Describe your current concerns in your own words.",
      },
      {
        id: "medications",
        label: "Current Psychiatric Medications",
        type: "textarea",
        placeholder: "List any medications you are currently taking.",
      },
      {
        id: "previousTreatment",
        label: "Previous Psychiatric Treatment",
        type: "textarea",
        placeholder: "Describe any previous therapy or psychiatric care.",
      },
      {
        id: "previousHospitalizations",
        label: "Previous Psychiatric Hospitalizations",
        type: "textarea",
        placeholder: "List any previous inpatient or partial hospitalizations.",
      },
      {
        id: "pharmacy",
        label: "Preferred pharmacy (optional)",
        type: "text",
        placeholder: "Name and location or address",
      },
    ],
    scales: ["phq9", "gad7"],
  },
  // pediatric: { ... } — Phase 4
  // Will add: guardianName, guardianRelationship, whoCompletedForm,
  // schoolName, grade, developmentalHistory
}

// ─────────────────────────────────────────────
// Steps
// ─────────────────────────────────────────────

function IntakeHeader() {
  return (
    <header className="intake-header">
      <span className="intake-brand">PsychMetric</span>
      <span className="intake-header-sub">Secure Patient Intake</span>
    </header>
  )
}

function StepVerify({ tokenData, onVerified }) {
  const [dobInput, setDobInput] = useState("")
  const [error, setError] = useState("")

  function handleVerify(e) {
    e.preventDefault()
    if (dobInput === tokenData.dob) {
      onVerified(tokenData.patientName.trim().split(" ")[0])
    } else {
      setError("That date of birth does not match our records. Please try again.")
    }
  }

  return (
    <div className="intake-card">
      <p className="intake-step-label">Identity Verification</p>
      <h1 className="intake-title">Welcome to your intake</h1>
      <p className="intake-subtitle">
        Please confirm your date of birth to begin your PsychMetric intake.
      </p>
      <form onSubmit={handleVerify} noValidate>
        <div className="intake-field">
          <label className="intake-label" htmlFor="dob-verify">Date of Birth</label>
          <input
            id="dob-verify"
            type="date"
            className="intake-input"
            value={dobInput}
            onChange={(e) => setDobInput(e.target.value)}
            required
          />
        </div>
        {error && <p className="intake-error" role="alert">{error}</p>}
        <button type="submit" className="intake-primary-btn" style={{ marginTop: "16px" }}>
          Continue
        </button>
      </form>
    </div>
  )
}

// ─────────────────────────────────────────────
// StepForm — renders config-driven fields
// ─────────────────────────────────────────────
function StepForm({ tokenData, firstName, config, onComplete }) {
  // Initialise patient state from config
  const initPatient = Object.fromEntries(
    config.patientFields.map((f) => {
      if (f.id === "fullName") return [f.id, tokenData.patientName]
      if (f.id === "dob")      return [f.id, tokenData.dob]
      return [f.id, ""]
    })
  )
  const initClinical = Object.fromEntries(
    config.clinicalFields.map((f) => [f.id, ""])
  )

  const [patient,   setPatientState]   = useState(initPatient)
  const [clinical,  setClinicalState]  = useState(initClinical)
  // chipSelections tracks WHICH chip button is visually active (separate from
  // the stored value, because free-text chips need a marker key like "_self")
  const [chipSelections, setChipSelections] = useState({})
  // Inline validation errors — only for required fields
  const [fieldErrors,    setFieldErrors]    = useState({})

  function setPatientField(id, value) {
    setPatientState((prev) => ({ ...prev, [id]: value }))
  }
  function setClinicalField(id, value) {
    setClinicalState((prev) => ({ ...prev, [id]: value }))
  }

  // Chip interaction: track visual selection + update stored value
  function handleChipSelect(fieldId, opt, setter) {
    setChipSelections((prev) => ({ ...prev, [fieldId]: opt.value }))
    if (!opt.freeText) {
      setter(fieldId, opt.value)
    } else {
      // For free-text chips, keep existing typed text (or empty)
      // Value will be updated as user types in the free-text input
    }
    // Clear any existing error for this field
    if (fieldErrors[fieldId]) {
      setFieldErrors((prev) => { const e = { ...prev }; delete e[fieldId]; return e })
    }
  }

  function handleChipFreeText(fieldId, text, setter) {
    setter(fieldId, text)
  }

  // Validation: check all required fields across both sections
  function validate() {
    const allFields = [...config.patientFields, ...config.clinicalFields]
    const allValues = { ...patient, ...clinical }
    const errors = {}
    allFields.forEach((f) => {
      if (f.required && !f.readOnly) {
        const val = allValues[f.id] ?? ""
        if (!val.trim()) {
          errors[f.id] = f.errorMessage || "This field is required."
        }
      }
    })
    return errors
  }

  function handleSubmit(e) {
    e.preventDefault()
    const errors = validate()
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors)
      // Scroll to the first error field
      const firstErrorId = Object.keys(errors)[0]
      document.getElementById(firstErrorId)?.scrollIntoView({ behavior: "smooth", block: "center" })
      return
    }
    setFieldErrors({})
    onComplete({ ...patient, ...clinical })
  }

  // ── Field renderers ────────────────────────
  function renderChipsField(field, value, setter) {
    const selectedChipValue = chipSelections[field.id] ?? null
    const selectedOpt = field.options.find((o) => o.value === selectedChipValue)
    const showFreeText = selectedOpt?.freeText === true

    return (
      <div className="intake-chips-field">
        <div className="intake-chips" role="group" aria-label={field.label}>
          {field.options.map((opt) => (
            <button
              key={opt.value}
              type="button"
              className={`intake-chip${selectedChipValue === opt.value ? " intake-chip--selected" : ""}`}
              aria-pressed={selectedChipValue === opt.value}
              onClick={() => handleChipSelect(field.id, opt, setter)}
            >
              {opt.label}
            </button>
          ))}
        </div>
        {showFreeText && (
          <input
            type="text"
            className="intake-input"
            style={{ marginTop: "10px" }}
            placeholder="Please describe…"
            value={value}
            onChange={(e) => handleChipFreeText(field.id, e.target.value, setter)}
            autoFocus
          />
        )}
      </div>
    )
  }

  function renderField(field, value, setter) {
    switch (field.type) {
      case "chips":
        return renderChipsField(field, value, setter)
      case "textarea":
        return (
          <textarea
            id={field.id}
            className={`intake-textarea${fieldErrors[field.id] ? " intake-input--error" : ""}`}
            value={value}
            onChange={(e) => {
              setter(field.id, e.target.value)
              if (fieldErrors[field.id]) setFieldErrors((p) => { const e = { ...p }; delete e[field.id]; return e })
            }}
            placeholder={field.placeholder || ""}
            rows={3}
          />
        )
      default:
        return (
          <input
            id={field.id}
            type={field.type}
            className={`intake-input${fieldErrors[field.id] ? " intake-input--error" : ""}`}
            value={value}
            onChange={(e) => {
              setter(field.id, e.target.value)
              if (fieldErrors[field.id]) setFieldErrors((p) => { const e = { ...p }; delete e[field.id]; return e })
            }}
            placeholder={field.placeholder || ""}
            readOnly={field.readOnly || false}
            required={field.required || false}
          />
        )
    }
  }

  function renderFieldBlock(field, valueMap, setter) {
    const value = valueMap[field.id] ?? ""
    const hasError = Boolean(fieldErrors[field.id])
    return (
      <div className="intake-field" key={field.id}>
        <label className="intake-label" htmlFor={field.id}>
          {field.label}
          {field.required && !field.readOnly && (
            <span className="intake-label-required" aria-hidden="true"> *</span>
          )}
        </label>
        {renderField(field, value, setter)}
        {field.helper && !hasError && (
          <p className="intake-field-helper">{field.helper}</p>
        )}
        {hasError && (
          <p className="intake-field-error" role="alert">{fieldErrors[field.id]}</p>
        )}
      </div>
    )
  }

  const hasErrors = Object.keys(fieldErrors).length > 0

  return (
    <form onSubmit={handleSubmit} noValidate>
      <div className="intake-card">
        <h2 className="intake-section-title">Patient Information</h2>
        {config.patientFields.map((field) =>
          renderFieldBlock(field, patient, setPatientField)
        )}
      </div>

      <div className="intake-card">
        <h2 className="intake-section-title">Clinical Information</h2>
        <p className="intake-subtitle" style={{ marginTop: 0, marginBottom: "20px" }}>
          Your answers help your clinician prepare for your visit.
        </p>
        {config.clinicalFields.map((field) =>
          renderFieldBlock(field, clinical, setClinicalField)
        )}
      </div>

      {hasErrors && (
        <p className="intake-error" role="alert" style={{ marginBottom: "12px" }}>
          Please complete the required fields marked above before continuing.
        </p>
      )}

      <button type="submit" className="intake-primary-btn">
        Continue to Questionnaires →
      </button>
    </form>
  )
}

function StepDone() {
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

// ─────────────────────────────────────────────
// Main IntakePage
// ─────────────────────────────────────────────
export default function IntakePage() {
  const { token } = useParams()
  const [step,      setStep]      = useState("loading")
  const [tokenData, setTokenData] = useState(null)
  const [firstName, setFirstName] = useState("")
  const [formData,  setFormData]  = useState(null)
  const [phq9Result, setPhq9Result] = useState(null)
  const [gad7Result, setGad7Result] = useState(null)

  const config = INTAKE_CONFIG.adult

  // Step 1 — load and validate token
  useEffect(() => {
    async function loadToken() {
      try {
        const snap = await getDoc(doc(db, "intakeTokens", token))
        if (!snap.exists()) { setStep("invalid"); return }

        const data = snap.data()

        if (data.expiresAt) {
          const expiry = data.expiresAt.toDate ? data.expiresAt.toDate() : new Date(data.expiresAt)
          if (expiry < new Date()) { setStep("expired"); return }
        }

        if (data.status === "completed") { setStep("already-done"); return }

        setTokenData(data)
        setStep("verify")
      } catch {
        setStep("invalid")
      }
    }
    loadToken()
  }, [token])

  function handleVerified(first)     { setFirstName(first); setStep("form") }
  function handleFormComplete(data)  { setFormData(data);   setStep("phq9") }
  function handlePHQ9Complete(result){ setPhq9Result(result); setStep("gad7") }

  // ─────────────────────────────────────────────
  // Core submission — addDoc is the critical write,
  // updateDoc on intakeTokens is best-effort.
  // ─────────────────────────────────────────────
  const submitIntake = useCallback(async (gad7Data) => {
    setStep("submitting")
    try {
      await addDoc(collection(db, "pending_intakes"), {
        // Token / ownership
        token,
        clinicianId: tokenData.clinicianId,

        // Patient identifiers
        patientName:  formData.fullName || tokenData.patientName,
        dob:          formData.dob      || tokenData.dob,
        preferredName: formData.preferredName || "",
        phone:         formData.phone         || "",
        email:         formData.email         || "",

        // Identity (optional)
        genderIdentity: formData.genderIdentity || "",
        pronouns:       formData.pronouns       || "",

        // Safety / contact (required)
        allergies:             formData.allergies             || "",
        emergencyContactName:  formData.emergencyContactName  || "",
        emergencyContactPhone: formData.emergencyContactPhone || "",

        // Clinical
        chiefComplaint:         formData.chiefComplaint         || "",
        treatmentGoals:         formData.treatmentGoals         || "",
        currentConcerns:        formData.currentConcerns        || "",
        medications:            formData.medications            || "",
        previousTreatment:      formData.previousTreatment      || "",
        previousHospitalizations: formData.previousHospitalizations || "",
        pharmacy:               formData.pharmacy               || "",

        // Scales
        phq9Responses: phq9Result.responses,
        phq9Score:     phq9Result.score,
        phq9Severity:  phq9Result.severity,
        phq9Q9Flag:    phq9Result.phq9Q9Flag,
        gad7Responses: gad7Data.responses,
        gad7Score:     gad7Data.score,
        gad7Severity:  gad7Data.severity,

        status:    "completed",
        createdAt: serverTimestamp(),
      })

      // Best-effort token status update — patient is unauthenticated
      updateDoc(doc(db, "intakeTokens", token), { status: "completed" }).catch(
        (e) => console.warn("[IntakePage] Token status update failed (non-fatal):", e?.code)
      )

      setStep("done")
    } catch (err) {
      console.error("[IntakePage] Submission failed:", err?.code, err)
      setStep("submit-error")
    }
  }, [token, tokenData, formData, phq9Result])

  function handleGAD7Complete(result) {
    setGad7Result(result)
    submitIntake(result)
  }

  function handleRetry() {
    if (gad7Result) submitIntake(gad7Result)
  }

  // ── Render ──
  return (
    <div className="intake-shell">
      <IntakeHeader />
      <div className="intake-body">

        {step === "loading" && (
          <div className="intake-card" style={{ textAlign: "center", padding: "48px" }}>
            <p className="intake-subtitle">Loading your intake form…</p>
          </div>
        )}

        {step === "expired" && (
          <div className="intake-card" style={{ textAlign: "center" }}>
            <h2 className="intake-title">Link expired</h2>
            <p className="intake-subtitle">
              This intake link has expired. Please contact your clinician for a new link.
            </p>
          </div>
        )}

        {step === "invalid" && (
          <div className="intake-card" style={{ textAlign: "center" }}>
            <h2 className="intake-title">Link not found</h2>
            <p className="intake-subtitle">
              This intake link is not valid. Please contact your clinician for a new link.
            </p>
          </div>
        )}

        {step === "already-done" && (
          <div className="intake-card" style={{ textAlign: "center" }}>
            <h2 className="intake-title">Already submitted</h2>
            <p className="intake-subtitle">
              This intake has already been submitted. Please contact your clinician
              if you need to make changes.
            </p>
          </div>
        )}

        {step === "verify" && tokenData && (
          <StepVerify tokenData={tokenData} onVerified={handleVerified} />
        )}

        {step === "form" && tokenData && (
          <>
            <div className="intake-welcome-banner">
              <p>Welcome, <strong>{firstName}</strong>. This form takes about 5–10 minutes.</p>
            </div>
            <StepForm
              tokenData={tokenData}
              firstName={firstName}
              config={config}
              onComplete={handleFormComplete}
            />
          </>
        )}

        {step === "phq9" && (
          <div className="intake-card">
            <p className="intake-step-label">Questionnaire 1 of 2</p>
            <PHQ9 onComplete={handlePHQ9Complete} continueLabel="Continue to GAD-7 →" />
          </div>
        )}

        {step === "gad7" && (
          <div className="intake-card">
            <p className="intake-step-label">Questionnaire 2 of 2</p>
            <GAD7 onComplete={handleGAD7Complete} continueLabel="Submit Intake →" />
          </div>
        )}

        {step === "submitting" && (
          <div className="intake-card" style={{ textAlign: "center", padding: "48px" }}>
            <p className="intake-subtitle">Submitting your intake form…</p>
          </div>
        )}

        {step === "submit-error" && (
          <div className="intake-card" style={{ textAlign: "center" }}>
            <h2 className="intake-title">Submission error</h2>
            <p className="intake-subtitle">
              Your answers are saved. Please tap the button below to try again.
              Do not refresh this page.
            </p>
            <button type="button" className="intake-primary-btn" onClick={handleRetry} style={{ marginTop: "8px" }}>
              Try Again
            </button>
          </div>
        )}

        {step === "done" && <StepDone />}

      </div>
    </div>
  )
}

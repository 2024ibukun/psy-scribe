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
// Intake form configuration
// Structured so a pediatric version can be added
// in a later phase without rebuilding this page.
// Pediatric will need: guardian name, relationship,
// who completed the form, school name, grade.
// ─────────────────────────────────────────────
const INTAKE_CONFIG = {
  adult: {
    type: "adult",
    patientFields: [
      { id: "fullName", label: "Full Name", type: "text", required: true },
      { id: "dob", label: "Date of Birth", type: "date", required: true, readOnly: true },
      { id: "preferredName", label: "Preferred Name (Optional)", type: "text" },
      { id: "phone", label: "Phone Number", type: "tel" },
      { id: "email", label: "Email Address", type: "email" },
    ],
    clinicalFields: [
      {
        id: "chiefComplaint",
        label: "Chief Complaint",
        type: "text",
        placeholder: "What brings you in today?",
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
    ],
    scales: ["phq9", "gad7"],
  },
  // pediatric: { ... } — Phase 4
}

// ─────────────────────────────────────────────
// Steps: loading → expired | invalid | already-done | verify → form → phq9 → gad7 → submitting → done
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
      const firstName = tokenData.patientName.trim().split(" ")[0]
      onVerified(firstName)
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

function StepForm({ tokenData, firstName, config, onComplete }) {
  const initPatient = Object.fromEntries(
    config.patientFields.map((f) => {
      if (f.id === "fullName") return [f.id, tokenData.patientName]
      if (f.id === "dob") return [f.id, tokenData.dob]
      return [f.id, ""]
    })
  )
  const initClinical = Object.fromEntries(
    config.clinicalFields.map((f) => [f.id, ""])
  )

  const [patient, setPatient] = useState(initPatient)
  const [clinical, setClinical] = useState(initClinical)

  function setPatientField(id, value) {
    setPatient((prev) => ({ ...prev, [id]: value }))
  }
  function setClinicalField(id, value) {
    setClinical((prev) => ({ ...prev, [id]: value }))
  }

  function handleSubmit(e) {
    e.preventDefault()
    onComplete({ ...patient, ...clinical })
  }

  function renderField(field, value, onChange) {
    if (field.type === "textarea") {
      return (
        <textarea
          id={field.id}
          className="intake-textarea"
          value={value}
          onChange={(e) => onChange(field.id, e.target.value)}
          placeholder={field.placeholder || ""}
          rows={3}
        />
      )
    }
    return (
      <input
        id={field.id}
        type={field.type}
        className="intake-input"
        value={value}
        onChange={(e) => onChange(field.id, e.target.value)}
        placeholder={field.placeholder || ""}
        readOnly={field.readOnly || false}
        required={field.required || false}
      />
    )
  }

  return (
    <form onSubmit={handleSubmit} noValidate>
      <div className="intake-card">
        <h2 className="intake-section-title">Patient Information</h2>
        {config.patientFields.map((field) => (
          <div className="intake-field" key={field.id}>
            <label className="intake-label" htmlFor={field.id}>{field.label}</label>
            {renderField(field, patient[field.id], setPatientField)}
          </div>
        ))}
      </div>

      <div className="intake-card">
        <h2 className="intake-section-title">Clinical Information</h2>
        <p className="intake-subtitle" style={{ marginTop: 0, marginBottom: "20px" }}>
          Your answers help your clinician prepare for your visit.
        </p>
        {config.clinicalFields.map((field) => (
          <div className="intake-field" key={field.id}>
            <label className="intake-label" htmlFor={field.id}>{field.label}</label>
            {renderField(field, clinical[field.id], setClinicalField)}
          </div>
        ))}
      </div>

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
      <h2 className="intake-title" style={{ marginBottom: "10px" }}>
        Thank you.
      </h2>
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
  const [step, setStep] = useState("loading")
  const [tokenData, setTokenData] = useState(null)
  const [firstName, setFirstName] = useState("")
  const [formData, setFormData] = useState(null)
  const [phq9Result, setPhq9Result] = useState(null)
  // Preserved in state so the retry button can re-submit without losing data
  const [gad7Result, setGad7Result] = useState(null)

  const config = INTAKE_CONFIG.adult

  // Step 1 — load and validate token
  useEffect(() => {
    async function loadToken() {
      try {
        const snap = await getDoc(doc(db, "intakeTokens", token))
        if (!snap.exists()) {
          setStep("invalid")
          return
        }
        const data = snap.data()

        // Check expiration — expiresAt is a Firestore Timestamp
        if (data.expiresAt) {
          const expiry = data.expiresAt.toDate ? data.expiresAt.toDate() : new Date(data.expiresAt)
          if (expiry < new Date()) {
            setStep("expired")
            return
          }
        }

        // One-time use — already submitted
        if (data.status === "completed") {
          setStep("already-done")
          return
        }

        setTokenData(data)
        setStep("verify")
      } catch {
        setStep("invalid")
      }
    }
    loadToken()
  }, [token])

  function handleVerified(first) {
    setFirstName(first)
    setStep("form")
  }

  function handleFormComplete(data) {
    setFormData(data)
    setStep("phq9")
  }

  function handlePHQ9Complete(result) {
    setPhq9Result(result)
    setStep("gad7")
  }

  // ─────────────────────────────────────────────
  // Core submission — decoupled writes.
  // addDoc to pending_intakes is the critical write.
  // updateDoc to intakeTokens is best-effort cleanup
  // (patient is unauthenticated; rules may block it).
  // ─────────────────────────────────────────────
  const submitIntake = useCallback(async (gad7Data) => {
    setStep("submitting")
    try {
      await addDoc(collection(db, "pending_intakes"), {
        token,
        clinicianId: tokenData.clinicianId,
        patientName: formData.fullName || tokenData.patientName,
        dob: formData.dob || tokenData.dob,
        preferredName: formData.preferredName || "",
        phone: formData.phone || "",
        email: formData.email || "",
        chiefComplaint: formData.chiefComplaint || "",
        currentConcerns: formData.currentConcerns || "",
        medications: formData.medications || "",
        previousTreatment: formData.previousTreatment || "",
        previousHospitalizations: formData.previousHospitalizations || "",
        phq9Responses: phq9Result.responses,
        phq9Score: phq9Result.score,
        phq9Severity: phq9Result.severity,
        phq9Q9Flag: phq9Result.phq9Q9Flag,
        gad7Responses: gad7Data.responses,
        gad7Score: gad7Data.score,
        gad7Severity: gad7Data.severity,
        status: "completed",          // intake lifecycle status
        createdAt: serverTimestamp(),
      })

      // Best-effort token status update — do NOT await.
      // Patient is unauthenticated; if rules block this, it is non-fatal.
      updateDoc(doc(db, "intakeTokens", token), { status: "completed" }).catch(
        (e) => console.warn("[IntakePage] Token status update failed (non-fatal):", e?.code)
      )

      setStep("done")
    } catch (err) {
      const code = err?.code ?? "unknown"
      console.error("[IntakePage] Submission failed:", code, err)
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
            <PHQ9
              onComplete={handlePHQ9Complete}
              continueLabel="Continue to GAD-7 →"
            />
          </div>
        )}

        {step === "gad7" && (
          <div className="intake-card">
            <p className="intake-step-label">Questionnaire 2 of 2</p>
            <GAD7
              onComplete={handleGAD7Complete}
              continueLabel="Submit Intake →"
            />
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
            <button
              type="button"
              className="intake-primary-btn"
              onClick={handleRetry}
              style={{ marginTop: "8px" }}
            >
              Try Again
            </button>
          </div>
        )}

        {step === "done" && <StepDone />}

      </div>
    </div>
  )
}

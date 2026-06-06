import { useState, useEffect } from "react"
import {
  collection,
  doc,
  setDoc,
  getDocs,
  query,
  where,
  serverTimestamp,
} from "firebase/firestore"
import { db } from "../../firebase"
import IntakeCard from "./IntakeCard"

function generateToken() {
  // pt_ + 8 random hex chars — unguessable, URL-safe
  const raw = crypto.randomUUID().replace(/-/g, "")
  return "pt_" + raw.slice(0, 8)
}

function GenerateLinkPanel({ user }) {
  const [patientName, setPatientName] = useState("")
  const [dob, setDob] = useState("")
  const [loading, setLoading] = useState(false)
  const [generatedLink, setGeneratedLink] = useState(null)
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState("")

  async function handleGenerate(e) {
    e.preventDefault()
    setError("")
    if (!patientName.trim() || !dob) {
      setError("Please enter the patient name and date of birth.")
      return
    }
    setLoading(true)
    try {
      const token = generateToken()
      await setDoc(doc(db, "intakeTokens", token), {
        token,
        clinicianId: user.uid,
        patientName: patientName.trim(),
        dob,
        status: "pending",
        createdAt: serverTimestamp(),
      })
      const link = `${window.location.origin}/intake/${token}`
      setGeneratedLink(link)
    } catch (err) {
      setError("Failed to generate link. Please try again.")
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  async function handleCopy() {
    await navigator.clipboard.writeText(generatedLink)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  function handleReset() {
    setGeneratedLink(null)
    setPatientName("")
    setDob("")
    setCopied(false)
  }

  return (
    <div className="intake-generate-panel">
      <h2>Prepare Intake Form</h2>
      <p className="intake-generate-desc">
        Generate a secure link for your patient to complete before their visit.
        The link does not require a patient account.
      </p>

      {!generatedLink ? (
        <form className="intake-generate-form" onSubmit={handleGenerate} noValidate>
          <div className="intake-field">
            <label className="intake-label" htmlFor="ig-name">Patient Name</label>
            <input
              id="ig-name"
              type="text"
              className="intake-input"
              value={patientName}
              onChange={(e) => setPatientName(e.target.value)}
              placeholder="Full name"
              autoComplete="off"
            />
          </div>
          <div className="intake-field">
            <label className="intake-label" htmlFor="ig-dob">Date of Birth</label>
            <input
              id="ig-dob"
              type="date"
              className="intake-input"
              value={dob}
              onChange={(e) => setDob(e.target.value)}
            />
          </div>
          {error && <p className="intake-error">{error}</p>}
          <button
            type="submit"
            className="intake-primary-btn"
            disabled={loading}
          >
            {loading ? "Generating…" : "Generate Intake Link"}
          </button>
        </form>
      ) : (
        <div className="intake-generated-link">
          <p>Intake link ready — share with your patient</p>
          <p className="intake-link-text">{generatedLink}</p>
          <div style={{ display: "flex", gap: "8px" }}>
            <button
              type="button"
              className={`intake-copy-btn${copied ? " intake-copy-btn--copied" : ""}`}
              onClick={handleCopy}
            >
              {copied ? "Copied ✓" : "Copy Link"}
            </button>
            <button type="button" className="intake-copy-btn" onClick={handleReset}>
              New Link
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function RecentIntakes({ user }) {
  const [intakes, setIntakes] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    async function fetchIntakes() {
      try {
        const q = query(
          collection(db, "pending_intakes"),
          where("clinicianId", "==", user.uid)
        )
        const snapshot = await getDocs(q)
        const data = snapshot.docs
          .map((d) => ({ id: d.id, ...d.data() }))
          .sort(
            (a, b) =>
              (b.createdAt?.seconds ?? 0) - (a.createdAt?.seconds ?? 0)
          )
        setIntakes(data)
      } catch (err) {
        setError("Could not load recent intakes.")
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    fetchIntakes()
  }, [user.uid])

  if (loading) return <p className="intake-loading">Loading recent intakes…</p>
  if (error) return <p className="intake-error">{error}</p>

  return (
    <div className="recent-intakes">
      <h2>Recent Intakes</h2>
      {intakes.length === 0 ? (
        <p className="intake-empty-state">
          No completed intakes yet. Share a link with a patient to get started.
        </p>
      ) : (
        <div className="intake-results-grid">
          {intakes.map((intake) => (
            <IntakeCard key={intake.id} intake={intake} />
          ))}
        </div>
      )}
    </div>
  )
}

export default function SmartIntakePage({ user }) {
  return (
    <section className="placeholder-page">
      <div className="placeholder-copy">
        <p className="eyebrow">Smart Intake</p>
        <h1>Patient intake before the visit.</h1>
        <p>
          Send patients a secure link. They complete PHQ-9, GAD-7, and clinical
          history before they arrive. Scores and a copy-ready summary are waiting
          when you open the chart.
        </p>
      </div>
      <GenerateLinkPanel user={user} />
      <RecentIntakes user={user} />
    </section>
  )
}

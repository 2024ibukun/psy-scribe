import { useState, useEffect } from "react"
import {
  collection,
  doc,
  setDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  query,
  where,
  serverTimestamp,
  Timestamp,
} from "firebase/firestore"
import { db } from "../../firebase"
import IntakeCard from "./IntakeCard"

const EXPIRY_DAYS = 14

function generateToken() {
  const raw = crypto.randomUUID().replace(/-/g, "")
  return "pt_" + raw.slice(0, 8)
}

// ─────────────────────────────────────────────
// Generate Link Panel
// ─────────────────────────────────────────────
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
    if (!user?.uid) {
      setError("Authentication error — please sign out and sign in again.")
      return
    }

    setLoading(true)
    try {
      const token = generateToken()
      const expiresAt = Timestamp.fromDate(
        new Date(Date.now() + EXPIRY_DAYS * 24 * 60 * 60 * 1000)
      )

      await Promise.race([
        setDoc(doc(db, "intakeTokens", token), {
          token,
          clinicianId: user.uid,
          patientName: patientName.trim(),
          dob,
          status: "pending",
          createdAt: serverTimestamp(),
          expiresAt,
        }),
        new Promise((_, reject) =>
          setTimeout(
            () => reject(Object.assign(new Error("Firestore did not respond"), { code: "TIMEOUT" })),
            12000
          )
        ),
      ])

      setGeneratedLink(`${window.location.origin}/intake/${token}`)
    } catch (err) {
      const code = err?.code ?? "unknown"
      console.error("[SmartIntake] setDoc error:", code, err)
      if (code === "TIMEOUT") {
        setError(
          "Firestore is not responding (timed out). " +
          "Go to Firebase Console → Firestore Database and ensure the database exists and rules are published."
        )
      } else if (code === "permission-denied") {
        setError(
          "Firestore permissions denied. " +
          "Publish the security rules in Firebase Console → Firestore Database → Rules tab."
        )
      } else {
        setError(`Write failed (${code}). Check the browser console (F12) for details.`)
      }
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
        Links expire after {EXPIRY_DAYS} days and can only be used once.
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
          <button type="submit" className="intake-primary-btn" disabled={loading}>
            {loading ? "Generating…" : "Generate Intake Link"}
          </button>
        </form>
      ) : (
        <div className="intake-generated-link">
          <p>Intake link ready — expires in {EXPIRY_DAYS} days</p>
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

// ─────────────────────────────────────────────
// Recent Intakes Panel — with lifecycle tabs
// ─────────────────────────────────────────────
function RecentIntakes({ user }) {
  const [intakes, setIntakes] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [view, setView] = useState("active") // "active" | "reviewed"

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
          .sort((a, b) => (b.createdAt?.seconds ?? 0) - (a.createdAt?.seconds ?? 0))
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

  async function handleMarkReviewed(id) {
    try {
      await updateDoc(doc(db, "pending_intakes", id), { status: "reviewed" })
      // Optimistic update — move to reviewed in local state
      setIntakes((prev) =>
        prev.map((item) => item.id === id ? { ...item, status: "reviewed" } : item)
      )
    } catch (err) {
      console.error("[SmartIntake] Mark reviewed failed:", err)
      alert("Could not mark as reviewed. Please try again.")
    }
  }

  async function handleDelete(id, token) {
    try {
      await deleteDoc(doc(db, "pending_intakes", id))
      // Best-effort: also delete the token document
      deleteDoc(doc(db, "intakeTokens", token)).catch(
        (e) => console.warn("[SmartIntake] Token delete failed (non-fatal):", e?.code)
      )
      // Remove from local state immediately
      setIntakes((prev) => prev.filter((item) => item.id !== id))
    } catch (err) {
      console.error("[SmartIntake] Delete failed:", err)
      alert("Could not delete this intake. Please try again.")
    }
  }

  if (loading) return <p className="intake-loading">Loading recent intakes…</p>
  if (error) return <p className="intake-error">{error}</p>

  const activeIntakes = (intakes ?? []).filter(
    (i) => i.status === "completed" || !i.status
  )
  const reviewedIntakes = (intakes ?? []).filter(
    (i) => i.status === "reviewed"
  )
  const displayed = view === "active" ? activeIntakes : reviewedIntakes

  return (
    <div className="recent-intakes">
      <h2>Recent Intakes</h2>

      {/* Lifecycle disclaimer */}
      <div className="intake-lifecycle-note" role="note">
        <strong>Intakes are temporary.</strong> Copy the summary to your EMR, then mark reviewed
        or delete. PsychMetric is not a medical record system.
      </div>

      {/* View tabs */}
      <div className="intake-view-tabs" role="tablist">
        <button
          type="button"
          role="tab"
          aria-selected={view === "active"}
          className={`intake-view-tab${view === "active" ? " intake-view-tab--active" : ""}`}
          onClick={() => setView("active")}
        >
          Awaiting Review
          {activeIntakes.length > 0 && (
            <span className="intake-tab-count">{activeIntakes.length}</span>
          )}
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={view === "reviewed"}
          className={`intake-view-tab${view === "reviewed" ? " intake-view-tab--active" : ""}`}
          onClick={() => setView("reviewed")}
        >
          Reviewed
          {reviewedIntakes.length > 0 && (
            <span className="intake-tab-count">{reviewedIntakes.length}</span>
          )}
        </button>
      </div>

      {displayed.length === 0 ? (
        <p className="intake-empty-state">
          {view === "active"
            ? "No intakes awaiting review. Share a link with a patient to get started."
            : "No reviewed intakes yet."}
        </p>
      ) : (
        <div className="intake-results-grid">
          {displayed.map((intake) => (
            <IntakeCard
              key={intake.id}
              intake={intake}
              onMarkReviewed={view === "active" ? handleMarkReviewed : null}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────
// SmartIntakePage
// ─────────────────────────────────────────────
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

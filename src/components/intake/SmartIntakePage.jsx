import { useState, useEffect } from "react"
import { Link } from "react-router-dom"
import {
  collection,
  doc,
  setDoc,
  getDoc,
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

const ADULT_SCALES = [
  { id: "phq9",   label: "PHQ-9" },
  { id: "gad7",   label: "GAD-7" },
  { id: "pcl5",   label: "PCL-5" },
  { id: "auditc", label: "AUDIT-C" },
]

const PEDIATRIC_SCALES = [
  { id: "phqa",    label: "PHQ-A" },
  { id: "scared5", label: "SCARED-5" },
  { id: "crafft",  label: "CRAFFT" },
]

function generateToken() {
  const raw = crypto.randomUUID().replace(/-/g, "")
  return "pt_" + raw.slice(0, 8)
}

// ─────────────────────────────────────────────
// Generate Link Panel
// ─────────────────────────────────────────────
// Calculate age from a YYYY-MM-DD string; returns { age, autoType } or null
function calcAgeInfo(dobStr) {
  if (!dobStr) return null
  // Force local-time parsing to avoid UTC-midnight off-by-one
  const [y, m, d] = dobStr.split("-").map(Number)
  const dob = new Date(y, m - 1, d)
  const today = new Date()
  let age = today.getFullYear() - dob.getFullYear()
  const mDiff = today.getMonth() - dob.getMonth()
  if (mDiff < 0 || (mDiff === 0 && today.getDate() < dob.getDate())) age--
  return { age, autoType: age < 18 ? "pediatric" : "adult" }
}

function GenerateLinkPanel({ user, profile }) {
  const [patientName,        setPatientName]        = useState("")
  const [dob,                setDob]                = useState("")
  const [patientEmail,       setPatientEmail]       = useState("")
  const [patientPhone,       setPatientPhone]       = useState("")
  const [intakeTypeOverride, setIntakeTypeOverride] = useState(null) // null = use auto
  const [visitType,          setVisitType]          = useState("new")
  const [selectedScales,     setSelectedScales]     = useState([])
  const [loading,            setLoading]            = useState(false)
  const [generatedLink,      setGeneratedLink]      = useState(null)
  const [copied,             setCopied]             = useState(false)
  const [copiedMsg,          setCopiedMsg]          = useState(false)
  const [error,              setError]              = useState("")

  // Reset override when DOB changes
  useEffect(() => { setIntakeTypeOverride(null) }, [dob])

  // Reset selected scales when switching back to new patient
  useEffect(() => { if (visitType === "new") setSelectedScales([]) }, [visitType])

  const ageInfo       = calcAgeInfo(dob)
  const effectiveType = intakeTypeOverride ?? ageInfo?.autoType ?? "adult"

  const suggestedMessage = generatedLink
    ? profile?.clinicName
      ? `Hi, this is ${profile.clinicName}. Before your ${effectiveType === "pediatric" ? "child's" : ""} appointment, please complete your intake form here: ${generatedLink}. It takes about 10 minutes.`.replace("your  appointment", "your appointment")
      : `Please complete your intake form before the appointment: ${generatedLink}. It takes about 10 minutes.`
    : ""

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
          intakeType: effectiveType,
          visitType,
          selectedScales,
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
          "Go to Firebase Console → Firestore Database and ensure the database and rules are set up."
        )
      } else if (code === "permission-denied") {
        setError(
          "Firestore permissions denied. Publish the security rules in Firebase Console → Firestore Database → Rules."
        )
      } else {
        setError(`Write failed (${code}). Check the browser console (F12) for details.`)
      }
    } finally {
      setLoading(false)
    }
  }

  async function handleCopyLink() {
    await navigator.clipboard.writeText(generatedLink)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  async function handleCopyMessage() {
    await navigator.clipboard.writeText(suggestedMessage)
    setCopiedMsg(true)
    setTimeout(() => setCopiedMsg(false), 2000)
  }

  function handleReset() {
    setGeneratedLink(null)
    setPatientName("")
    setDob("")
    setPatientEmail("")
    setPatientPhone("")
    setVisitType("new")
    setSelectedScales([])
    setCopied(false)
    setCopiedMsg(false)
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
          {/* Visit type toggle */}
          <div className="intake-field">
            <p className="intake-label" id="ig-visit-type-label">Visit type</p>
            <div className="intake-chips" role="group" aria-labelledby="ig-visit-type-label">
              {[
                { id: "new",      label: "New Patient" },
                { id: "followup", label: "Follow-Up" },
              ].map(({ id, label }) => (
                <button
                  key={id}
                  type="button"
                  className={`intake-chip${visitType === id ? " intake-chip--selected" : ""}`}
                  onClick={() => setVisitType(id)}
                  aria-pressed={visitType === id}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

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
          {/* Age and intake-type auto-detection with manual override */}
          {ageInfo && (
            <div className="intake-type-detect">
              <span className="intake-type-detect__age">Age {ageInfo.age}</span>
              <span className="intake-type-detect__arrow">→</span>
              <span className={`intake-type-badge intake-type-badge--${effectiveType}`}>
                {effectiveType === "pediatric" ? "Pediatric" : "Adult"}
              </span>
              <button
                type="button"
                className="intake-type-change"
                onClick={() =>
                  setIntakeTypeOverride(effectiveType === "pediatric" ? "adult" : "pediatric")
                }
              >
                {effectiveType === "pediatric" ? "Change to Adult" : "Change to Pediatric"}
              </button>
              {intakeTypeOverride && (
                <button
                  type="button"
                  className="intake-type-reset"
                  onClick={() => setIntakeTypeOverride(null)}
                  title="Reset to auto-detected type"
                >
                  ↩ Auto
                </button>
              )}
            </div>
          )}

          {/* Follow-up scales selector — only shown when Follow-Up is selected */}
          {visitType === "followup" && (
            <div className="intake-field">
              <p className="intake-label" id="ig-scales-label">
                Include assessments <span className="intake-label-optional">(optional)</span>
              </p>
              <p className="intake-field-helper">
                All unchecked by default. Select only what you need for this visit.
              </p>
              <div className="rtw-checklist" role="group" aria-labelledby="ig-scales-label">
                {(effectiveType === "pediatric" ? PEDIATRIC_SCALES : ADULT_SCALES).map((scale) => (
                  <label key={scale.id} className="rtw-checklist__item">
                    <input
                      type="checkbox"
                      className="rtw-checklist__input"
                      checked={selectedScales.includes(scale.id)}
                      onChange={() =>
                        setSelectedScales((prev) =>
                          prev.includes(scale.id)
                            ? prev.filter((s) => s !== scale.id)
                            : [...prev, scale.id]
                        )
                      }
                    />
                    <span className="rtw-checklist__label">{scale.label}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          <div className="intake-field">
            <label className="intake-label" htmlFor="ig-email">
              Patient email <span className="intake-label-optional">(optional)</span>
            </label>
            <input
              id="ig-email"
              type="email"
              className="intake-input"
              value={patientEmail}
              onChange={(e) => setPatientEmail(e.target.value)}
              placeholder="patient@email.com"
              autoComplete="off"
            />
          </div>
          <div className="intake-field">
            <label className="intake-label" htmlFor="ig-phone">
              Patient phone <span className="intake-label-optional">(optional)</span>
            </label>
            <input
              id="ig-phone"
              type="tel"
              className="intake-input"
              value={patientPhone}
              onChange={(e) => setPatientPhone(e.target.value)}
              placeholder="e.g. 555-867-5309"
              autoComplete="off"
            />
          </div>

          {error && <p className="intake-error">{error}</p>}
          <button type="submit" className="intake-primary-btn" disabled={loading}>
            {loading ? "Generating…" : "Generate Intake Link"}
          </button>
        </form>
      ) : (
        <div>
          {/* Link */}
          <div className="intake-generated-link">
            <p>Intake link ready — expires in {EXPIRY_DAYS} days</p>
            <p className="intake-link-text">{generatedLink}</p>
            <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
              <button
                type="button"
                className={`intake-copy-btn${copied ? " intake-copy-btn--copied" : ""}`}
                onClick={handleCopyLink}
              >
                {copied ? "Copied ✓" : "Copy Link"}
              </button>
              <button type="button" className="intake-copy-btn" onClick={handleReset}>
                New Link
              </button>
            </div>
            {(patientEmail.trim() || patientPhone.trim()) && (
              <div className="intake-send-actions">
                {patientEmail.trim() && (() => {
                  const subject = encodeURIComponent("Your intake form for your upcoming appointment")
                  const body = encodeURIComponent(
                    "Please complete your intake form before your visit using the secure link below." +
                    " It takes about 10 minutes and does not require creating an account.\n\n" +
                    generatedLink + "\n\n" +
                    "This link expires in 14 days and can only be used once.\n\n" +
                    "If you have any questions, please contact our office."
                  )
                  return (
                    <a
                      href={`mailto:${patientEmail.trim()}?subject=${subject}&body=${body}`}
                      className="intake-send-btn"
                    >
                      Open Email Draft
                    </a>
                  )
                })()}
                {patientPhone.trim() && (() => {
                  const body = encodeURIComponent(
                    `Please complete your intake form before your visit: ${generatedLink} — Link expires in 14 days.`
                  )
                  return (
                    <a
                      href={`sms:${patientPhone.trim()}?body=${body}`}
                      className="intake-send-btn"
                    >
                      Open SMS
                    </a>
                  )
                })()}
              </div>
            )}
          </div>

          {/* Suggested message */}
          <div className="intake-message-panel">
            <p className="intake-message-panel__label">Suggested message to patient</p>
            <p className="intake-message-text">{suggestedMessage}</p>
            <button
              type="button"
              className={`intake-copy-btn${copiedMsg ? " intake-copy-btn--copied" : ""}`}
              onClick={handleCopyMessage}
            >
              {copiedMsg ? "Copied ✓" : "Copy Message"}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────
// Patient Intakes Panel
// ─────────────────────────────────────────────
const FORTY_EIGHT_H_MS = 48 * 60 * 60 * 1000

function RecentIntakes({ user }) {
  const [intakes,           setIntakes]           = useState(null)
  const [loading,           setLoading]           = useState(true)
  const [error,             setError]             = useState("")
  const [intakeFilter,      setIntakeFilter]      = useState("all")
  const [showOlderReviewed, setShowOlderReviewed] = useState(false)
  const [showReviewed,      setShowReviewed]      = useState(false)

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
      await updateDoc(doc(db, "pending_intakes", id), {
        status: "reviewed",
        reviewedAt: serverTimestamp(),
      })
      setIntakes((prev) =>
        prev.map((item) =>
          item.id === id
            ? { ...item, status: "reviewed", reviewedAt: { seconds: Math.floor(Date.now() / 1000) } }
            : item
        )
      )
    } catch (err) {
      console.error("[SmartIntake] Mark reviewed failed:", err)
      alert("Could not mark as reviewed. Please try again.")
    }
  }

  async function handleDelete(id, token) {
    try {
      await deleteDoc(doc(db, "pending_intakes", id))
      deleteDoc(doc(db, "intakeTokens", token)).catch(
        (e) => console.warn("[SmartIntake] Token delete failed (non-fatal):", e?.code)
      )
      setIntakes((prev) => prev.filter((item) => item.id !== id))
    } catch (err) {
      console.error("[SmartIntake] Delete failed:", err)
      alert("Could not delete this intake. Please try again.")
    }
  }

  if (loading) return <p className="intake-loading">Loading recent intakes…</p>
  if (error)   return <p className="intake-error">{error}</p>

  // ── Filter helpers ──────────────────────────────────────────────────────────
  function matchesFilter(intake) {
    if (intakeFilter === "followup") return intake.intakeType === "followup"
    if (intakeFilter === "new")      return intake.intakeType !== "followup"
    return true // "all"
  }

  function isRecentlyReviewed(intake) {
    if (!intake.reviewedAt) return true // no timestamp → always show
    const ms = intake.reviewedAt.seconds
      ? intake.reviewedAt.seconds * 1000
      : new Date(intake.reviewedAt).getTime()
    return Date.now() - ms <= FORTY_EIGHT_H_MS
  }

  function emptyMessage(section) {
    if (intakeFilter === "followup") return "No Follow-Up intakes in this section."
    if (intakeFilter === "new")      return "No New Intake intakes in this section."
    return section === "active"
      ? "No intakes awaiting review. Share a link with a patient to get started."
      : "No reviewed intakes yet."
  }

  const allActive   = (intakes ?? []).filter((i) => i.status === "completed" || !i.status)
  const allReviewed = (intakes ?? []).filter((i) => i.status === "reviewed")

  const filteredActive   = allActive.filter(matchesFilter)
  const visibleReviewed  = showOlderReviewed ? allReviewed : allReviewed.filter(isRecentlyReviewed)
  const filteredReviewed = visibleReviewed.filter(matchesFilter)

  return (
    <div className="recent-intakes">
      <h2>Patient Intakes</h2>

      {/* ── Type filter tabs ── */}
      <div className="intake-filter-tabs" role="tablist" aria-label="Filter by intake type">
        {[
          { id: "all",      label: "All" },
          { id: "new",      label: "New Intake" },
          { id: "followup", label: "Follow-Up" },
        ].map(({ id, label }) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={intakeFilter === id}
            className={`intake-chip${intakeFilter === id ? " intake-chip--selected" : ""}`}
            onClick={() => setIntakeFilter(id)}
          >
            {label}
          </button>
        ))}
      </div>

      {/* ── Awaiting Review section ── */}
      <div className="intake-section">
        <div className="intake-section-header">
          <h3 className="intake-section-title">
            Awaiting Review
            {filteredActive.length > 0 && (
              <span className="intake-tab-count">{filteredActive.length}</span>
            )}
          </h3>
        </div>
        {filteredActive.length === 0 ? (
          <p className="intake-empty-state">{emptyMessage("active")}</p>
        ) : (
          <div className="intake-results-grid">
            {filteredActive.map((intake) => (
              <IntakeCard
                key={intake.id}
                intake={intake}
                onMarkReviewed={handleMarkReviewed}
                onDelete={handleDelete}
              />
            ))}
          </div>
        )}
      </div>

      {/* ── Reviewed section — collapsed by default ── */}
      <div className="intake-section">
        <button
          type="button"
          className="intake-reviewed-toggle-header"
          onClick={() => setShowReviewed((v) => !v)}
          aria-expanded={showReviewed}
        >
          <span className="intake-section-title">
            Reviewed
            {filteredReviewed.length > 0 && (
              <span className="intake-tab-count">{filteredReviewed.length}</span>
            )}
          </span>
          <span className="intake-reviewed-chevron" aria-hidden="true">
            {showReviewed ? "▲" : "▼"}
          </span>
        </button>

        {showReviewed && (
          <>
            <label className="intake-older-toggle" style={{ marginBottom: "12px" }}>
              <input
                type="checkbox"
                checked={showOlderReviewed}
                onChange={(e) => setShowOlderReviewed(e.target.checked)}
              />
              Show older reviewed intakes
            </label>

            {filteredReviewed.length === 0 ? (
              <p className="intake-empty-state">{emptyMessage("reviewed")}</p>
            ) : (
              <div className="intake-results-grid">
                {filteredReviewed.map((intake) => (
                  <IntakeCard
                    key={intake.id}
                    intake={intake}
                    onMarkReviewed={null}
                    onDelete={handleDelete}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </div>

      <p className="intake-footer-note">
        Intakes are temporary. Copy the summary to your EMR, then mark reviewed or delete.
        PsychMetric is not a medical record system.
      </p>
    </div>
  )
}

// ─────────────────────────────────────────────
// SmartIntakePage
// ─────────────────────────────────────────────
export default function SmartIntakePage({ user }) {
  const [profile,       setProfile]       = useState(null)
  const [profileLoaded, setProfileLoaded] = useState(false)

  useEffect(() => {
    async function loadProfile() {
      try {
        const snap = await getDoc(doc(db, "clinicianProfiles", user.uid))
        if (snap.exists()) setProfile(snap.data())
      } catch (err) {
        console.error("[SmartIntake] profile load:", err)
      } finally {
        setProfileLoaded(true)
      }
    }
    loadProfile()
  }, [user.uid])

  const profileIsSet = profile?.clinicianName?.trim() || profile?.clinicName?.trim()

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

      {/* Gentle profile setup prompt */}
      {profileLoaded && !profileIsSet && (
        <div className="profile-setup-prompt" role="note">
          Set your clinician and clinic name so patients recognise your intake links.{" "}
          <Link to="/settings/profile">Set up profile →</Link>
        </div>
      )}

      <GenerateLinkPanel user={user} profile={profile} />
      <RecentIntakes user={user} />
    </section>
  )
}

import { useState, useEffect, useCallback } from "react"
import { Link } from "react-router-dom"
import { doc, getDoc } from "firebase/firestore"
import { db } from "../../firebase"

function todayStr() {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, "0")
  const day = String(d.getDate()).padStart(2, "0")
  return `${y}-${m}-${day}`
}

function formatDate(str) {
  if (!str) return ""
  const [y, m, d] = str.split("-").map(Number)
  const months = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
  ]
  return `${months[m - 1]} ${d}, ${y}`
}

/**
 * LetterShell
 *
 * Reusable two-panel frame for StatForm letter types.
 *
 * Props:
 *   user          — authenticated Firebase user (required for profile fetch)
 *   bodyContent   — string from the parent with the assembled letter body
 *   children      — JSX rendered in the form panel's body-fields slot
 *                   (letter-type-specific inputs managed by the parent)
 *   onCoreChange  — optional callback({ patientName, patientDob, letterDate, credentials })
 *                   called whenever any core field changes — use in Part 3 so the parent
 *                   can reference patient name/DOB when building bodyContent
 */
export default function LetterShell({
  user,
  bodyContent = "",
  children,
  onCoreChange,
  placeholder = "Letter body will appear here as you fill in the fields above.",
  patientNameOverride = "",
  patientDobOverride  = "",
}) {
  const [profile,       setProfile]       = useState(null)
  const [profileLoaded, setProfileLoaded] = useState(false)
  const [patientName,   setPatientName]   = useState("")
  const [patientDob,    setPatientDob]    = useState("")
  const [letterDate,    setLetterDate]    = useState(todayStr)
  const [credentials,   setCredentials]   = useState("")
  const [copied,        setCopied]        = useState(false)

  useEffect(() => {
    async function loadProfile() {
      try {
        const snap = await getDoc(doc(db, "clinicianProfiles", user.uid))
        if (snap.exists()) setProfile(snap.data())
      } catch (err) {
        console.error("[LetterShell] profile load:", err)
      } finally {
        setProfileLoaded(true)
      }
    }
    loadProfile()
  }, [user.uid])

  // Pre-fill patient name / DOB when the parent selects a recent intake
  useEffect(() => { setPatientName(patientNameOverride) }, [patientNameOverride])
  useEffect(() => { setPatientDob(patientDobOverride)   }, [patientDobOverride])

  // Notify parent whenever core fields change (for Part 3 body assembly)
  useEffect(() => {
    onCoreChange?.({ patientName, patientDob, letterDate, credentials })
  }, [patientName, patientDob, letterDate, credentials]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Plain-text assembly ───────────────────────────────────────────────────
  const buildPlainText = useCallback(() => {
    const lines = []
    if (profile?.clinicName) lines.push(profile.clinicName)
    if (profile?.clinicAddress) {
      profile.clinicAddress.split("\n").forEach((l) => { if (l.trim()) lines.push(l.trim()) })
    }
    if (profile?.clinicPhone) lines.push(profile.clinicPhone)
    lines.push("")
    lines.push(letterDate ? formatDate(letterDate) : "")
    lines.push("")
    lines.push("To Whom It May Concern,")
    lines.push("")
    if (bodyContent.trim()) {
      bodyContent.split("\n").forEach((l) => lines.push(l))
    } else {
      lines.push("[Letter body]")
    }
    lines.push("")
    lines.push("Sincerely,")
    lines.push("")
    if (profile?.clinicianName) lines.push(profile.clinicianName)
    if (credentials.trim())     lines.push(credentials.trim())
    if (profile?.clinicName)    lines.push(profile.clinicName)
    if (profile?.clinicPhone)   lines.push(profile.clinicPhone)
    return lines.join("\n")
  }, [profile, letterDate, bodyContent, credentials])

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(buildPlainText())
      setCopied(true)
      setTimeout(() => setCopied(false), 2200)
    } catch {
      // clipboard blocked in some contexts — silent fail
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="letter-shell">
      {/* ── LEFT PANEL: form ── */}
      <div className="letter-shell__form">

        {/* Clinic identity — read-only */}
        <div className="letter-shell__clinic-block">
          <p className="letter-shell__clinic-label">Clinic Identity</p>
          {!profileLoaded && (
            <p className="letter-shell__clinic-loading">Loading profile…</p>
          )}
          {profileLoaded && !profile?.clinicName && !profile?.clinicianName && (
            <p className="letter-shell__clinic-missing">
              No profile set.{" "}
              <Link to="/settings/profile" className="letter-shell__clinic-link">
                Set up profile →
              </Link>
            </p>
          )}
          {profileLoaded && (profile?.clinicName || profile?.clinicianName) && (
            <div className="letter-shell__clinic-rows">
              {profile.clinicName && (
                <span className="letter-shell__clinic-name">{profile.clinicName}</span>
              )}
              {profile.clinicianName && (
                <span className="letter-shell__clinic-detail">{profile.clinicianName}</span>
              )}
              {profile.clinicAddress && (
                <span className="letter-shell__clinic-detail" style={{ whiteSpace: "pre-line" }}>
                  {profile.clinicAddress}
                </span>
              )}
              {profile.clinicPhone && (
                <span className="letter-shell__clinic-detail">{profile.clinicPhone}</span>
              )}
            </div>
          )}
        </div>

        {/* Core letter fields */}
        <div className="intake-card letter-shell__fields-card">
          <div className="intake-field">
            <label className="intake-label" htmlFor="ls-patient-name">Patient Name</label>
            <input
              id="ls-patient-name"
              type="text"
              className="intake-input"
              value={patientName}
              onChange={(e) => setPatientName(e.target.value)}
              placeholder="Full legal name"
              autoComplete="off"
            />
          </div>

          <div className="intake-field">
            <label className="intake-label" htmlFor="ls-dob">Patient Date of Birth</label>
            <input
              id="ls-dob"
              type="date"
              className="intake-input"
              value={patientDob}
              onChange={(e) => setPatientDob(e.target.value)}
            />
          </div>

          <div className="intake-field">
            <label className="intake-label" htmlFor="ls-letter-date">Letter Date</label>
            <input
              id="ls-letter-date"
              type="date"
              className="intake-input"
              value={letterDate}
              onChange={(e) => setLetterDate(e.target.value)}
            />
          </div>

          <div className="intake-field">
            <label className="intake-label" htmlFor="ls-creds">Credentials</label>
            <input
              id="ls-creds"
              type="text"
              className="intake-input"
              value={credentials}
              onChange={(e) => setCredentials(e.target.value)}
              placeholder="MD, Child & Adolescent Psychiatry"
            />
          </div>

          {/* Body-fields slot — filled by the parent letter type */}
          {children && (
            <div className="letter-shell__body-slot">
              <hr className="letter-shell__divider" />
              {children}
            </div>
          )}
        </div>
      </div>

      {/* ── RIGHT PANEL: letter preview ── */}
      <div className="letter-shell__preview-wrap">
        <div className="letter-preview" id="letter-preview-printable">

          {/* Letterhead — centered name / address / phone, then ruled line */}
          <div className="letter-preview__letterhead">
            {profile?.clinicName && (
              <p className="letter-preview__lh-name">{profile.clinicName}</p>
            )}
            {profile?.clinicAddress && profile.clinicAddress.trim().split("\n").map((line, i) =>
              line.trim() ? (
                <p key={i} className="letter-preview__lh-meta">{line.trim()}</p>
              ) : null
            )}
            {profile?.clinicPhone && (
              <p className="letter-preview__lh-meta">{profile.clinicPhone}</p>
            )}
          </div>

          {/* Date */}
          <p className="letter-preview__date">
            {letterDate ? formatDate(letterDate) : " "}
          </p>

          {/* Salutation */}
          <p className="letter-preview__salutation">To Whom It May Concern,</p>

          {/* Body */}
          <div className="letter-preview__body">
            {bodyContent.trim() ? (
              bodyContent.split("\n").map((line, i) => (
                <p key={i} className="letter-preview__para">
                  {line || " "}
                </p>
              ))
            ) : (
              <p className="letter-preview__placeholder">{placeholder}</p>
            )}
          </div>

          {/* Signature block */}
          <div className="letter-preview__signature">
            <p className="letter-preview__sign-close">Sincerely,</p>
            <div className="letter-preview__sign-gap" aria-hidden="true" />
            {profile?.clinicianName && (
              <p className="letter-preview__sign-name">{profile.clinicianName}</p>
            )}
            {credentials.trim() && (
              <p className="letter-preview__sign-line">{credentials.trim()}</p>
            )}
            {profile?.clinicName && (
              <p className="letter-preview__sign-line">{profile.clinicName}</p>
            )}
            {profile?.clinicPhone && (
              <p className="letter-preview__sign-line">{profile.clinicPhone}</p>
            )}
          </div>
        </div>

        {/* Action buttons */}
        <div className="letter-shell__actions">
          <button
            type="button"
            className={`letter-shell__copy-btn${copied ? " letter-shell__copy-btn--copied" : ""}`}
            onClick={handleCopy}
          >
            {copied ? "Copied ✓" : "Copy Letter"}
          </button>
          <button
            type="button"
            className="letter-shell__print-btn"
            onClick={() => window.print()}
          >
            Print / Save as PDF
          </button>
        </div>
      </div>
    </div>
  )
}

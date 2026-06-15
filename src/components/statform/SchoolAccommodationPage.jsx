import { useState, useMemo, useCallback, useEffect } from "react"
import { Link } from "react-router-dom"
import { collection, getDocs, query, where } from "firebase/firestore"
import { db } from "../../firebase"
import LetterShell from "./LetterShell"

// ── Date helper ───────────────────────────────────────────────────────────────

function fmtDate(str) {
  if (!str) return ""
  const MONTHS = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
  ]
  const [y, m, d] = str.split("-").map(Number)
  return `${MONTHS[m - 1]} ${d}, ${y}`
}

function fmtTimestamp(ts) {
  if (!ts) return ""
  const d = ts.toDate ? ts.toDate() : new Date(ts.seconds ? ts.seconds * 1000 : ts)
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
}

// ── Accommodation options ─────────────────────────────────────────────────────

const ACCOMMODATION_OPTIONS = [
  { id: "extended-time",       label: "Extended time on tests and assignments" },
  { id: "reduced-course-load", label: "Reduced course load" },
  { id: "preferential-seating",label: "Preferential or separate seating" },
  { id: "frequent-breaks",     label: "Frequent breaks during the school day" },
  { id: "modified-attendance", label: "Modified attendance policy" },
  { id: "counselor-access",    label: "Access to school counselor or quiet space as needed" },
  { id: "extended-deadlines",  label: "Extended deadlines for assignments" },
]

// ── Duration options ──────────────────────────────────────────────────────────

const DURATION_OPTIONS = [
  "For the remainder of the current school year",
  "Ongoing / indefinite",
  "Specific timeframe",
]

const DURATION_MAP = {
  "For the remainder of the current school year": "for the remainder of the current school year",
  "Ongoing / indefinite":                         "on an ongoing basis",
}

// ── sessionStorage key ────────────────────────────────────────────────────────

const STORAGE_KEY = "statform-school-accommodation-v1"

// ── Component ─────────────────────────────────────────────────────────────────

export default function SchoolAccommodationPage({ user }) {
  // ── Intake loader state ───────────────────────────────────────────────────
  const [intakes,          setIntakes]          = useState([])
  const [intakesLoading,   setIntakesLoading]   = useState(true)
  const [selectedIntakeId, setSelectedIntakeId] = useState("")
  const [nameOverride,     setNameOverride]     = useState("")
  const [dobOverride,      setDobOverride]      = useState("")

  useEffect(() => {
    if (!user) {
      setIntakesLoading(false)
      return
    }
    async function loadIntakes() {
      try {
        const q = query(
          collection(db, "pending_intakes"),
          where("clinicianId", "==", user.uid)
        )
        const snap = await getDocs(q)
        const data = snap.docs
          .map((d) => ({ id: d.id, ...d.data() }))
          .sort((a, b) => (b.createdAt?.seconds ?? 0) - (a.createdAt?.seconds ?? 0))
        setIntakes(data)
      } catch (err) {
        console.error("[SchoolAccommodationPage] intake load:", err)
      } finally {
        setIntakesLoading(false)
      }
    }
    loadIntakes()
  }, [user?.uid])

  function handleIntakeSelect(e) {
    const id = e.target.value
    setSelectedIntakeId(id)
    if (!id) {
      setNameOverride("")
      setDobOverride("")
      return
    }
    const found = intakes.find((i) => i.id === id)
    if (found) {
      setNameOverride(found.patientName || "")
      setDobOverride(found.dob || "")
    }
  }

  // ── Core fields bubbled up from LetterShell ───────────────────────────────
  const [core, setCore] = useState({
    patientName: "", patientDob: "", letterDate: "", credentials: "",
  })
  const handleCoreChange = useCallback((c) => setCore(c), [])

  // ── Body-specific fields ──────────────────────────────────────────────────
  const [diagnosis,          setDiagnosis]          = useState("")
  const [impactText,         setImpactText]         = useState("")
  const [accommodations,     setAccommodations]     = useState([])
  const [accommodationOther, setAccommodationOther] = useState("")
  const [duration,           setDuration]           = useState("")
  const [durationCustom,     setDurationCustom]     = useState("")
  const [additionalNote,     setAdditionalNote]     = useState("")

  // ── sessionStorage: restore on mount ─────────────────────────────────────
  useEffect(() => {
    try {
      const saved = sessionStorage.getItem(STORAGE_KEY)
      if (!saved) return
      const s = JSON.parse(saved)
      if (s.diagnosis)                     setDiagnosis(s.diagnosis)
      if (s.impactText)                    setImpactText(s.impactText)
      if (Array.isArray(s.accommodations)) setAccommodations(s.accommodations)
      if (s.accommodationOther)            setAccommodationOther(s.accommodationOther)
      if (s.duration)                      setDuration(s.duration)
      if (s.durationCustom)               setDurationCustom(s.durationCustom)
      if (s.additionalNote)               setAdditionalNote(s.additionalNote)
      if (s.nameOverride)                 setNameOverride(s.nameOverride)
      if (s.dobOverride)                  setDobOverride(s.dobOverride)
      if (s.selectedIntakeId)             setSelectedIntakeId(s.selectedIntakeId)
    } catch { /* silent */ }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // ── sessionStorage: save on every relevant change ────────────────────────
  useEffect(() => {
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify({
        diagnosis, impactText, accommodations, accommodationOther,
        duration, durationCustom, additionalNote,
        nameOverride, dobOverride, selectedIntakeId,
      }))
    } catch { /* silent */ }
  }, [diagnosis, impactText, accommodations, accommodationOther, duration, durationCustom, additionalNote, nameOverride, dobOverride, selectedIntakeId])

  // ── Clear form ────────────────────────────────────────────────────────────
  function handleClearForm() {
    setDiagnosis("")
    setImpactText("")
    setAccommodations([])
    setAccommodationOther("")
    setDuration("")
    setDurationCustom("")
    setAdditionalNote("")
    setNameOverride("")
    setDobOverride("")
    setSelectedIntakeId("")
    try { sessionStorage.removeItem(STORAGE_KEY) } catch { /* silent */ }
  }

  // ── Accommodation toggle ──────────────────────────────────────────────────
  function toggleAccommodation(id) {
    setAccommodations((prev) =>
      prev.includes(id) ? prev.filter((a) => a !== id) : [...prev, id]
    )
  }

  // ── Letter body assembly ──────────────────────────────────────────────────
  const bodyContent = useMemo(() => {
    const { patientName, patientDob } = core
    const durationReady = duration && (duration !== "Specific timeframe" || durationCustom.trim())
    if (
      !patientName.trim() || !patientDob ||
      !diagnosis.trim() || !impactText.trim() ||
      accommodations.length === 0 || !durationReady
    ) return ""

    const dobStr = fmtDate(patientDob)

    const durationPhrase =
      duration === "Specific timeframe"
        ? `through ${durationCustom.trim()}`
        : DURATION_MAP[duration]

    const accomLines = ACCOMMODATION_OPTIONS
      .filter((o) => accommodations.includes(o.id))
      .map((o) => `- ${o.label}`)
    if (accommodationOther.trim()) accomLines.push(`- ${accommodationOther.trim()}`)

    const paragraphs = [
      `${patientName.trim()} (DOB: ${dobStr}) is a patient under my care with a diagnosis of ${diagnosis.trim()}.`,
      `As a result of this diagnosis, ${patientName.trim()} experiences the following difficulties in the school setting: ${impactText.trim()}`,
      "In light of this, I am recommending the following academic accommodations:\n" + accomLines.join("\n"),
      `These accommodations are recommended ${durationPhrase}.`,
    ]

    if (additionalNote.trim()) paragraphs.push(additionalNote.trim())
    paragraphs.push("Please feel free to contact our office with any questions regarding this request.")

    return paragraphs.join("\n")
  }, [core, diagnosis, impactText, accommodations, accommodationOther, duration, durationCustom, additionalNote])

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <section className="placeholder-page">
      <div className="placeholder-copy">
        <p className="eyebrow">
          <Link to="/statform" className="letter-breadcrumb">StatForm</Link>
          {" / "}School Accommodation Letter
        </p>
        <h1>School Accommodation Letter</h1>
        <p>
          Request academic accommodations for a student under your care.
          Fill in the fields on the left — the letter preview updates in real time.
        </p>
      </div>

      {/* ── Intake loader — full-width, above the two-panel form ── */}
      <div className="statform-intake-loader">
        <div className="statform-intake-loader__header">
          <label className="statform-intake-loader__label" htmlFor="sa-intake-select">
            Load patient from a recent intake{" "}
            <span className="intake-label-optional">(optional)</span>
          </label>
          <button type="button" className="statform-clear-btn" onClick={handleClearForm}>
            Clear form
          </button>
        </div>

        {!user ? (
          <p className="statform-intake-loader__hint">
            <Link to="/login" className="letter-shell__clinic-link">Sign in</Link>
            {" "}to load a patient from a recent intake.
          </p>
        ) : intakesLoading ? (
          <p className="statform-intake-loader__hint">Loading recent intakes…</p>
        ) : intakes.length === 0 ? (
          <p className="statform-intake-loader__hint">
            No completed intakes on file — enter patient details manually below.
          </p>
        ) : (
          <>
            <select
              id="sa-intake-select"
              className="statform-intake-loader__select"
              value={selectedIntakeId}
              onChange={handleIntakeSelect}
            >
              <option value="">— Enter manually —</option>
              {intakes.map((intake) => (
                <option key={intake.id} value={intake.id}>
                  {intake.patientName || "Unknown"}{fmtTimestamp(intake.createdAt) ? ` — submitted ${fmtTimestamp(intake.createdAt)}` : ""}
                </option>
              ))}
            </select>
            {selectedIntakeId && (
              <p className="statform-intake-loader__hint statform-intake-loader__hint--active">
                Patient name and date of birth pre-filled from intake — both fields remain editable.
              </p>
            )}
          </>
        )}
      </div>

      <LetterShell
        user={user}
        bodyContent={bodyContent}
        onCoreChange={handleCoreChange}
        placeholder="Fill in patient details and all required fields to preview the letter."
        patientNameOverride={nameOverride}
        patientDobOverride={dobOverride}
      >
        {/* ── Diagnosis ──────────────────────────────────────────────── */}
        <div className="intake-field">
          <label className="intake-label" htmlFor="sa-diagnosis">
            Diagnosis (as you'd like it to appear in the letter)
            <span className="intake-label-required" aria-hidden="true"> *</span>
          </label>
          <input
            id="sa-diagnosis"
            type="text"
            className="intake-input"
            value={diagnosis}
            onChange={(e) => setDiagnosis(e.target.value)}
            placeholder="e.g. Attention-Deficit/Hyperactivity Disorder (ADHD)"
            autoComplete="off"
          />
        </div>

        {/* ── Impact on learning ─────────────────────────────────────── */}
        <div className="intake-field">
          <label className="intake-label" htmlFor="sa-impact">
            Impact on learning or school functioning
            <span className="intake-label-required" aria-hidden="true"> *</span>
          </label>
          <textarea
            id="sa-impact"
            className="intake-textarea"
            value={impactText}
            onChange={(e) => setImpactText(e.target.value)}
            placeholder="Describe how this condition affects the student's ability to participate and perform in the school environment…"
            rows={4}
          />
        </div>

        {/* ── Requested accommodations ───────────────────────────────── */}
        <div className="intake-field">
          <p className="intake-label" id="sa-accom-label">
            Requested accommodations
            <span className="intake-label-required" aria-hidden="true"> *</span>
          </p>
          <div className="rtw-checklist" role="group" aria-labelledby="sa-accom-label">
            {ACCOMMODATION_OPTIONS.map((opt) => (
              <label key={opt.id} className="rtw-checklist__item">
                <input
                  type="checkbox"
                  className="rtw-checklist__input"
                  checked={accommodations.includes(opt.id)}
                  onChange={() => toggleAccommodation(opt.id)}
                />
                <span className="rtw-checklist__label">{opt.label}</span>
              </label>
            ))}
            <div className="rtw-other-row">
              <input
                type="text"
                className="intake-input rtw-other-input"
                value={accommodationOther}
                onChange={(e) => setAccommodationOther(e.target.value)}
                placeholder="Other (specify)…"
              />
            </div>
          </div>
        </div>

        {/* ── Expected duration ──────────────────────────────────────── */}
        <div className="intake-field">
          <p className="intake-label" id="sa-duration-label">
            Expected duration
            <span className="intake-label-required" aria-hidden="true"> *</span>
          </p>
          <div className="intake-chips" role="group" aria-labelledby="sa-duration-label">
            {DURATION_OPTIONS.map((d) => (
              <button
                key={d}
                type="button"
                className={`intake-chip${duration === d ? " intake-chip--selected" : ""}`}
                onClick={() => setDuration((prev) => prev === d ? "" : d)}
                aria-pressed={duration === d}
              >
                {d}
              </button>
            ))}
          </div>
          {duration === "Specific timeframe" && (
            <input
              type="text"
              className="intake-input sa-duration-custom"
              value={durationCustom}
              onChange={(e) => setDurationCustom(e.target.value)}
              placeholder="e.g. through December 2026"
              autoComplete="off"
            />
          )}
        </div>

        {/* ── Additional note ─────────────────────────────────────────── */}
        <div className="intake-field">
          <label className="intake-label" htmlFor="sa-note">
            Additional Note{" "}
            <span className="intake-label-optional">(optional)</span>
          </label>
          <textarea
            id="sa-note"
            className="intake-textarea"
            value={additionalNote}
            onChange={(e) => setAdditionalNote(e.target.value)}
            placeholder="Any additional clinical context to include…"
            rows={3}
          />
        </div>
      </LetterShell>
    </section>
  )
}

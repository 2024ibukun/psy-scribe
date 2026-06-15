import { useState, useMemo, useCallback, useEffect } from "react"
import { Link } from "react-router-dom"
import { collection, getDocs, query, where } from "firebase/firestore"
import { db } from "../../firebase"
import LetterShell from "./LetterShell"

// ── Date helpers ─────────────────────────────────────────────────────────────

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
]

function fmtDate(str) {
  if (!str) return ""
  const [y, m, d] = str.split("-").map(Number)
  return `${MONTHS[m - 1]} ${d}, ${y}`
}

function fmtTimestamp(ts) {
  if (!ts) return ""
  const d = ts.toDate ? ts.toDate() : new Date(ts.seconds ? ts.seconds * 1000 : ts)
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
}

// ── Restriction options ───────────────────────────────────────────────────────

const RESTRICTION_TYPES = ["No restrictions", "With accommodations"]

const ACCOMMODATION_OPTIONS = [
  { id: "reduced-schedule",  label: "Modified/reduced schedule" },
  { id: "reduced-workload",  label: "Reduced workload or course load temporarily" },
  { id: "remote-option",     label: "Remote work or school option, if available" },
  { id: "followup-required", label: "Follow-up appointment required" },
]

// ── sessionStorage key ────────────────────────────────────────────────────────

const STORAGE_KEY = "statform-return-to-work-v1"

// ── Component ─────────────────────────────────────────────────────────────────

export default function ReturnToWorkPage({ user }) {
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
        console.error("[ReturnToWorkPage] intake load:", err)
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
  const [returnDate,         setReturnDate]         = useState("")
  const [restrictionType,    setRestrictionType]    = useState("")
  const [accommodations,     setAccommodations]     = useState([])
  const [accommodationOther, setAccommodationOther] = useState("")
  const [additionalNote,     setAdditionalNote]     = useState("")

  // ── sessionStorage: restore on mount ─────────────────────────────────────
  useEffect(() => {
    try {
      const saved = sessionStorage.getItem(STORAGE_KEY)
      if (!saved) return
      const s = JSON.parse(saved)
      if (s.returnDate)                    setReturnDate(s.returnDate)
      if (s.restrictionType)               setRestrictionType(s.restrictionType)
      if (Array.isArray(s.accommodations)) setAccommodations(s.accommodations)
      if (s.accommodationOther)            setAccommodationOther(s.accommodationOther)
      if (s.additionalNote)                setAdditionalNote(s.additionalNote)
      if (s.nameOverride)                  setNameOverride(s.nameOverride)
      if (s.dobOverride)                   setDobOverride(s.dobOverride)
      if (s.selectedIntakeId)              setSelectedIntakeId(s.selectedIntakeId)
    } catch { /* silent */ }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // ── sessionStorage: save on every relevant change ────────────────────────
  useEffect(() => {
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify({
        returnDate, restrictionType, accommodations, accommodationOther,
        additionalNote, nameOverride, dobOverride, selectedIntakeId,
      }))
    } catch { /* silent */ }
  }, [returnDate, restrictionType, accommodations, accommodationOther, additionalNote, nameOverride, dobOverride, selectedIntakeId])

  // ── Clear form ────────────────────────────────────────────────────────────
  function handleClearForm() {
    setReturnDate("")
    setRestrictionType("")
    setAccommodations([])
    setAccommodationOther("")
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
    if (!patientName.trim() || !patientDob || !returnDate || !restrictionType) return ""

    const dobStr  = fmtDate(patientDob)
    const dateStr = fmtDate(returnDate)

    const paragraphs = [
      `This letter is to confirm that ${patientName.trim()} (DOB: ${dobStr}) was seen at this office and is medically cleared to return to work/school effective ${dateStr}.`,
    ]

    if (restrictionType === "No restrictions") {
      paragraphs.push("No work or school restrictions are recommended at this time.")
    } else {
      const lines = ACCOMMODATION_OPTIONS
        .filter((o) => accommodations.includes(o.id))
        .map((o) => `- ${o.label}`)
      if (accommodationOther.trim()) lines.push(`- ${accommodationOther.trim()}`)

      const accomBlock = lines.length > 0
        ? "The following accommodations are recommended upon return:\n" + lines.join("\n")
        : "The following accommodations are recommended upon return:"
      paragraphs.push(accomBlock)
    }

    if (additionalNote.trim()) paragraphs.push(additionalNote.trim())
    paragraphs.push("If you have any questions, please feel free to contact our office.")

    return paragraphs.join("\n")
  }, [core, returnDate, restrictionType, accommodations, accommodationOther, additionalNote])

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <section className="placeholder-page">
      <div className="placeholder-copy">
        <p className="eyebrow">
          <Link to="/statform" className="letter-breadcrumb">StatForm</Link>
          {" / "}Return to Work/School Letter
        </p>
        <h1>Return to Work/School Letter</h1>
        <p>
          Clear a patient to return to work or school following a medical absence.
          Fill in the fields on the left — the letter preview updates in real time.
        </p>
      </div>

      {/* ── Intake loader — full-width, above the two-panel form ── */}
      <div className="statform-intake-loader">
        <div className="statform-intake-loader__header">
          <label className="statform-intake-loader__label" htmlFor="rtw-intake-select">
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
              id="rtw-intake-select"
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
        placeholder="Fill in patient details to preview the letter."
        patientNameOverride={nameOverride}
        patientDobOverride={dobOverride}
      >
        {/* ── Date cleared to return ─────────────────────────────────── */}
        <div className="intake-field">
          <label className="intake-label" htmlFor="rtw-return-date">
            Date Cleared to Return
            <span className="intake-label-required" aria-hidden="true"> *</span>
          </label>
          <input
            id="rtw-return-date"
            type="date"
            className="intake-input"
            value={returnDate}
            onChange={(e) => setReturnDate(e.target.value)}
          />
        </div>

        {/* ── Restrictions upon return ───────────────────────────────── */}
        <div className="intake-field">
          <p className="intake-label" id="rtw-restriction-label">
            Restrictions upon Return
            <span className="intake-label-required" aria-hidden="true"> *</span>
          </p>
          <div className="intake-chips" role="group" aria-labelledby="rtw-restriction-label">
            {RESTRICTION_TYPES.map((r) => (
              <button
                key={r}
                type="button"
                className={`intake-chip${restrictionType === r ? " intake-chip--selected" : ""}`}
                onClick={() => setRestrictionType((prev) => prev === r ? "" : r)}
                aria-pressed={restrictionType === r}
              >
                {r}
              </button>
            ))}
          </div>
        </div>

        {/* ── Accommodations checklist — visible only when "With accommodations" ── */}
        {restrictionType === "With accommodations" && (
          <div className="intake-field">
            <p className="intake-label" id="rtw-accom-label">
              Select accommodations
            </p>
            <div className="rtw-checklist" role="group" aria-labelledby="rtw-accom-label">
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
        )}

        {/* ── Additional note ─────────────────────────────────────────── */}
        <div className="intake-field">
          <label className="intake-label" htmlFor="rtw-note">
            Additional Note{" "}
            <span className="intake-label-optional">(optional)</span>
          </label>
          <textarea
            id="rtw-note"
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

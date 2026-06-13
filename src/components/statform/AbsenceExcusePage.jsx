import { useState, useMemo, useCallback } from "react"
import { Link } from "react-router-dom"
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

function fmtDateRange(startStr, endStr) {
  if (!startStr) return ""
  const [sy, sm, sd] = startStr.split("-").map(Number)
  if (!endStr) return `${MONTHS[sm - 1]} ${sd}, ${sy}`
  const [ey, em, ed] = endStr.split("-").map(Number)
  if (sy === ey && sm === em) {
    // Same month: "June 13–14, 2026"
    return `${MONTHS[sm - 1]} ${sd}–${ed}, ${sy}`
  }
  // Different months: "June 13, 2026 – July 2, 2026"
  return `${MONTHS[sm - 1]} ${sd}, ${sy} – ${MONTHS[em - 1]} ${ed}, ${ey}`
}

// ── Reason options ────────────────────────────────────────────────────────────

const REASONS = ["Medical appointment", "Treatment", "Evaluation"]

const REASON_MAP = {
  "Medical appointment": "scheduled medical appointment",
  "Treatment":           "psychiatric treatment",
  "Evaluation":          "clinical evaluation",
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function AbsenceExcusePage({ user }) {
  // Core fields (patient name, DOB, letter date, credentials) live in LetterShell.
  // onCoreChange bubbles them up here so we can use them in body assembly.
  const [core, setCore] = useState({
    patientName: "", patientDob: "", letterDate: "", credentials: "",
  })

  // Body-specific fields
  const [absenceStart,   setAbsenceStart]   = useState("")
  const [absenceEnd,     setAbsenceEnd]     = useState("")
  const [showEndDate,    setShowEndDate]    = useState(false)
  const [reasonCategory, setReasonCategory] = useState("")
  const [additionalNote, setAdditionalNote] = useState("")

  // Stable reference — avoids triggering LetterShell's onCoreChange effect
  const handleCoreChange = useCallback((c) => setCore(c), [])

  // ── Letter body assembly ──────────────────────────────────────────────────
  const bodyContent = useMemo(() => {
    const { patientName, patientDob } = core
    // All four required fields must be present before we generate content
    if (!patientName.trim() || !patientDob || !absenceStart || !reasonCategory) return ""

    const dateStr  = fmtDateRange(absenceStart, showEndDate && absenceEnd ? absenceEnd : "")
    const dobStr   = fmtDate(patientDob)
    const reason   = REASON_MAP[reasonCategory]

    const paragraphs = [
      `This letter is to confirm that ${patientName.trim()} (DOB: ${dobStr}) was seen at this office on ${dateStr} for a ${reason}.`,
    ]
    if (additionalNote.trim()) {
      paragraphs.push(additionalNote.trim())
    }
    paragraphs.push("Please excuse any absence from work or school related to this appointment.")
    paragraphs.push("If you have any questions, please feel free to contact our office.")

    return paragraphs.join("\n")
  }, [core, absenceStart, absenceEnd, showEndDate, reasonCategory, additionalNote])

  // ── End-date toggle ───────────────────────────────────────────────────────
  function toggleEndDate() {
    if (showEndDate) setAbsenceEnd("")
    setShowEndDate((v) => !v)
  }

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <section className="placeholder-page">
      <div className="placeholder-copy">
        <p className="eyebrow">
          <Link to="/statform" className="letter-breadcrumb">StatForm</Link>
          {" / "}Absence Excuse Letter
        </p>
        <h1>Absence Excuse Letter</h1>
        <p>
          Confirm a patient's medical appointment or treatment absence for work or school.
          Fill in the fields on the left — the letter preview updates in real time.
        </p>
      </div>

      <LetterShell
        user={user}
        bodyContent={bodyContent}
        onCoreChange={handleCoreChange}
        placeholder="Fill in patient details to preview the letter."
      >
        {/* ── Date(s) of absence ─────────────────────────────────────── */}
        <div className="intake-field">
          <label className="intake-label" htmlFor="ae-start">
            Date(s) of Absence
            <span className="intake-label-required" aria-hidden="true"> *</span>
          </label>
          <input
            id="ae-start"
            type="date"
            className="intake-input"
            value={absenceStart}
            onChange={(e) => setAbsenceStart(e.target.value)}
          />
          {!showEndDate && (
            <button
              type="button"
              className="absence-add-end-btn"
              onClick={toggleEndDate}
            >
              + Add end date
            </button>
          )}
        </div>

        {showEndDate && (
          <div className="intake-field">
            <label className="intake-label" htmlFor="ae-end">End Date</label>
            <div className="absence-end-row">
              <input
                id="ae-end"
                type="date"
                className="intake-input"
                value={absenceEnd}
                min={absenceStart || undefined}
                onChange={(e) => setAbsenceEnd(e.target.value)}
              />
              <button
                type="button"
                className="absence-remove-end-btn"
                onClick={toggleEndDate}
                aria-label="Remove end date"
                title="Remove end date"
              >
                ✕
              </button>
            </div>
          </div>
        )}

        {/* ── Reason category ────────────────────────────────────────── */}
        <div className="intake-field">
          <p className="intake-label" id="ae-reason-label">
            Reason Category
            <span className="intake-label-required" aria-hidden="true"> *</span>
          </p>
          <div className="intake-chips" role="group" aria-labelledby="ae-reason-label">
            {REASONS.map((r) => (
              <button
                key={r}
                type="button"
                className={`intake-chip${reasonCategory === r ? " intake-chip--selected" : ""}`}
                onClick={() => setReasonCategory((prev) => prev === r ? "" : r)}
                aria-pressed={reasonCategory === r}
              >
                {r}
              </button>
            ))}
          </div>
        </div>

        {/* ── Additional note ─────────────────────────────────────────── */}
        <div className="intake-field">
          <label className="intake-label" htmlFor="ae-note">
            Additional Note{" "}
            <span className="intake-label-optional">(optional)</span>
          </label>
          <textarea
            id="ae-note"
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

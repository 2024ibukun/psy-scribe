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

function fmtDateRange(startStr, endStr) {
  if (!startStr) return ""
  const [sy, sm, sd] = startStr.split("-").map(Number)
  if (!endStr) return `${MONTHS[sm - 1]} ${sd}, ${sy}`
  const [ey, em, ed] = endStr.split("-").map(Number)
  if (sy === ey && sm === em) {
    return `${MONTHS[sm - 1]} ${sd}–${ed}, ${sy}`
  }
  return `${MONTHS[sm - 1]} ${sd}, ${sy} – ${MONTHS[em - 1]} ${ed}, ${ey}`
}

function fmtTimestamp(ts) {
  if (!ts) return ""
  const d = ts.toDate ? ts.toDate() : new Date(ts.seconds ? ts.seconds * 1000 : ts)
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
}

// ── Reason options ────────────────────────────────────────────────────────────

const REASONS = ["Medical appointment", "Treatment", "Evaluation"]

const REASON_MAP = {
  "Medical appointment": "a medical appointment",
  "Treatment":           "ongoing medical treatment",
  "Evaluation":          "a clinical evaluation",
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function AbsenceExcusePage({ user }) {
  // ── Intake loader state ───────────────────────────────────────────────────
  const [intakes,          setIntakes]          = useState([])
  const [intakesLoading,   setIntakesLoading]   = useState(true)
  const [selectedIntakeId, setSelectedIntakeId] = useState("")
  const [nameOverride,     setNameOverride]     = useState("")
  const [dobOverride,      setDobOverride]      = useState("")

  useEffect(() => {
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
        console.error("[AbsenceExcusePage] intake load:", err)
      } finally {
        setIntakesLoading(false)
      }
    }
    loadIntakes()
  }, [user.uid])

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
  const [absenceStart,   setAbsenceStart]   = useState("")
  const [absenceEnd,     setAbsenceEnd]     = useState("")
  const [showEndDate,    setShowEndDate]    = useState(false)
  const [reasonCategory, setReasonCategory] = useState("")
  const [additionalNote, setAdditionalNote] = useState("")

  // ── Letter body assembly ──────────────────────────────────────────────────
  const bodyContent = useMemo(() => {
    const { patientName, patientDob } = core
    if (!patientName.trim() || !patientDob || !absenceStart || !reasonCategory) return ""

    const dateStr = fmtDateRange(absenceStart, showEndDate && absenceEnd ? absenceEnd : "")
    const dobStr  = fmtDate(patientDob)
    const reason  = REASON_MAP[reasonCategory]

    const paragraphs = [
      `This letter is to confirm that ${patientName.trim()} (DOB: ${dobStr}) was seen at this office on ${dateStr} for ${reason}.`,
    ]
    if (additionalNote.trim()) paragraphs.push(additionalNote.trim())
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

      {/* ── Intake loader — full-width, above the two-panel form ── */}
      <div className="statform-intake-loader">
        <label className="statform-intake-loader__label" htmlFor="ae-intake-select">
          Load patient from a recent intake{" "}
          <span className="intake-label-optional">(optional)</span>
        </label>

        {intakesLoading ? (
          <p className="statform-intake-loader__hint">Loading recent intakes…</p>
        ) : intakes.length === 0 ? (
          <p className="statform-intake-loader__hint">
            No completed intakes on file — enter patient details manually below.
          </p>
        ) : (
          <>
            <select
              id="ae-intake-select"
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

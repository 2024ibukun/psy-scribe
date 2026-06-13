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

// ── Disability description chips ──────────────────────────────────────────────

const DISABILITY_TYPES = [
  "A mental health condition",
  "A psychiatric condition",
  "A medical condition",
  "Prefer to specify",
]

// ── Accommodation checklist options ───────────────────────────────────────────

const ACCOMMODATION_OPTIONS = [
  { id: "esa",          label: "Emotional support animal (ESA)" },
  { id: "psa",          label: "Psychiatric service animal" },
  { id: "ground-floor", label: "Ground-floor or accessible unit" },
  { id: "quiet-unit",   label: "Reduced noise environment" },
  { id: "unit-transfer",label: "Transfer to a different unit" },
  { id: "live-in-aide", label: "Permission for a live-in aide" },
]

// ── sessionStorage key ────────────────────────────────────────────────────────

const STORAGE_KEY = "statform-housing-accommodation-v1"

// ── Component ─────────────────────────────────────────────────────────────────

export default function HousingAccommodationPage({ user }) {
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
        console.error("[HousingAccommodationPage] intake load:", err)
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
  // Default to least-disclosing option so clinicians don't over-disclose by accident
  const [disabilityType,     setDisabilityType]     = useState("A mental health condition")
  const [disabilityCustom,   setDisabilityCustom]   = useState("")
  const [accommodations,     setAccommodations]     = useState([])
  const [accommodationOther, setAccommodationOther] = useState("")
  const [needText,           setNeedText]           = useState("")
  const [additionalNote,     setAdditionalNote]     = useState("")

  // ── sessionStorage: restore on mount ─────────────────────────────────────
  useEffect(() => {
    try {
      const saved = sessionStorage.getItem(STORAGE_KEY)
      if (!saved) return
      const s = JSON.parse(saved)
      if (s.disabilityType)                setDisabilityType(s.disabilityType)
      if (s.disabilityCustom)              setDisabilityCustom(s.disabilityCustom)
      if (Array.isArray(s.accommodations)) setAccommodations(s.accommodations)
      if (s.accommodationOther)            setAccommodationOther(s.accommodationOther)
      if (s.needText)                      setNeedText(s.needText)
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
        disabilityType, disabilityCustom, accommodations, accommodationOther,
        needText, additionalNote, nameOverride, dobOverride, selectedIntakeId,
      }))
    } catch { /* silent */ }
  }, [disabilityType, disabilityCustom, accommodations, accommodationOther, needText, additionalNote, nameOverride, dobOverride, selectedIntakeId])

  // ── Clear form ────────────────────────────────────────────────────────────
  function handleClearForm() {
    setDisabilityType("A mental health condition")
    setDisabilityCustom("")
    setAccommodations([])
    setAccommodationOther("")
    setNeedText("")
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
    const disabilityReady =
      disabilityType && (disabilityType !== "Prefer to specify" || disabilityCustom.trim())
    if (
      !patientName.trim() || !patientDob ||
      !disabilityReady ||
      accommodations.length === 0 ||
      !needText.trim()
    ) return ""

    const dobStr          = fmtDate(patientDob)
    const name            = patientName.trim()
    const rawPhrase        = disabilityType === "Prefer to specify"
      ? disabilityCustom.trim()
      : disabilityType
    const disabilityPhrase = rawPhrase.charAt(0).toLowerCase() + rawPhrase.slice(1)

    const accomLines = ACCOMMODATION_OPTIONS
      .filter((o) => accommodations.includes(o.id))
      .map((o) => `- ${o.label}`)
    if (accommodationOther.trim()) accomLines.push(`- ${accommodationOther.trim()}`)

    // Strip trailing period so the template sentence always ends with exactly one
    const needStr = needText.trim().replace(/\.$/, "")

    const paragraphs = [
      `I am writing on behalf of ${name} (DOB: ${dobStr}), who is a patient under my care. ${name} has ${disabilityPhrase} that substantially limits one or more major life activities and qualifies as a disability under the Fair Housing Act.`,
      `As their treating clinician, I can confirm that ${name} has a disability-related need for the following housing accommodation(s):\n${accomLines.join("\n")}`,
      `Specifically, ${needStr}.`,
    ]

    if (additionalNote.trim()) paragraphs.push(additionalNote.trim())
    paragraphs.push("I support this accommodation request and am available to discuss further if needed.")
    paragraphs.push("If you have any questions, please feel free to contact our office.")

    return paragraphs.join("\n")
  }, [core, disabilityType, disabilityCustom, accommodations, accommodationOther, needText, additionalNote])

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <section className="placeholder-page">
      <div className="placeholder-copy">
        <p className="eyebrow">
          <Link to="/statform" className="letter-breadcrumb">StatForm</Link>
          {" / "}Housing Accommodation Letter
        </p>
        <h1>Housing Accommodation Letter</h1>
        <p>
          Document a patient's disability-related need for a housing accommodation
          under the Fair Housing Act. Fill in the fields on the left — the letter
          preview updates in real time.
        </p>
      </div>

      {/* ── Intake loader — full-width, above the two-panel form ── */}
      <div className="statform-intake-loader">
        <div className="statform-intake-loader__header">
          <label className="statform-intake-loader__label" htmlFor="ha-intake-select">
            Load patient from a recent intake{" "}
            <span className="intake-label-optional">(optional)</span>
          </label>
          <button type="button" className="statform-clear-btn" onClick={handleClearForm}>
            Clear form
          </button>
        </div>

        {intakesLoading ? (
          <p className="statform-intake-loader__hint">Loading recent intakes…</p>
        ) : intakes.length === 0 ? (
          <p className="statform-intake-loader__hint">
            No completed intakes on file — enter patient details manually below.
          </p>
        ) : (
          <>
            <select
              id="ha-intake-select"
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
        {/* ── Disability description ─────────────────────────────────── */}
        <div className="intake-field">
          <p className="intake-label" id="ha-disability-label">
            Disability description
            <span className="intake-label-required" aria-hidden="true"> *</span>
          </p>
          <p className="intake-field-helper">
            Choose the least specific option that is clinically accurate. You do not need to name a diagnosis.
          </p>
          <div className="intake-chips" role="group" aria-labelledby="ha-disability-label">
            {DISABILITY_TYPES.map((t) => (
              <button
                key={t}
                type="button"
                className={`intake-chip${disabilityType === t ? " intake-chip--selected" : ""}`}
                onClick={() => setDisabilityType((prev) => prev === t ? "" : t)}
                aria-pressed={disabilityType === t}
              >
                {t}
              </button>
            ))}
          </div>
          {disabilityType === "Prefer to specify" && (
            <input
              type="text"
              className="intake-input ha-disability-custom"
              value={disabilityCustom}
              onChange={(e) => setDisabilityCustom(e.target.value)}
              placeholder="e.g. major depressive disorder"
              autoComplete="off"
            />
          )}
        </div>

        {/* ── Accommodation checklist ────────────────────────────────── */}
        <div className="intake-field">
          <p className="intake-label" id="ha-accom-label">
            Requested accommodation(s)
            <span className="intake-label-required" aria-hidden="true"> *</span>
          </p>
          <div className="rtw-checklist" role="group" aria-labelledby="ha-accom-label">
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

        {/* ── Disability-related need ────────────────────────────────── */}
        <div className="intake-field">
          <label className="intake-label" htmlFor="ha-need">
            How does this condition relate to the housing need?
            <span className="intake-label-required" aria-hidden="true"> *</span>
          </label>
          <p className="intake-field-helper">
            Describe the functional connection between the condition and the accommodation requested. You do not need to disclose a specific diagnosis.
          </p>
          <textarea
            id="ha-need"
            className="intake-textarea"
            value={needText}
            onChange={(e) => setNeedText(e.target.value)}
            placeholder="e.g. requires the presence of an emotional support animal to manage symptoms of anxiety and depression during periods of acute distress"
            rows={4}
          />
        </div>

        {/* ── Additional note ─────────────────────────────────────────── */}
        <div className="intake-field">
          <label className="intake-label" htmlFor="ha-note">
            Additional Note{" "}
            <span className="intake-label-optional">(optional)</span>
          </label>
          <textarea
            id="ha-note"
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

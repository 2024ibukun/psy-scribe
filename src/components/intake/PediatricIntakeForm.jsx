import { useState } from "react"

// ─────────────────────────────────────────────
// Shared chip renderer used by all 4 sections
// ─────────────────────────────────────────────
function ChipGroup({ fieldId, options, selections, onSelect, value, onFreeText }) {
  const selectedValue = selections[fieldId] ?? null
  const selectedOpt   = options.find((o) => o.value === selectedValue)
  const showFreeText  = selectedOpt?.freeText === true

  return (
    <div className="intake-chips-field">
      <div className="intake-chips" role="group">
        {options.map((opt) => (
          <button
            key={opt.value}
            type="button"
            className={`intake-chip${selectedValue === opt.value ? " intake-chip--selected" : ""}`}
            aria-pressed={selectedValue === opt.value}
            onClick={() => onSelect(fieldId, opt)}
          >
            {opt.label}
          </button>
        ))}
      </div>
      {showFreeText && (
        <input
          type="text"
          className="intake-input"
          style={{ marginTop: "10px" }}
          placeholder="Please describe…"
          value={value ?? ""}
          onChange={(e) => onFreeText(fieldId, e.target.value)}
          autoFocus
        />
      )}
    </div>
  )
}

// Relationship options with free-text fallback
const RELATIONSHIP_OPTIONS = [
  { label: "Mother",          value: "Mother" },
  { label: "Father",          value: "Father" },
  { label: "Legal Guardian",  value: "Legal Guardian" },
  { label: "Other",           value: "_other", freeText: true },
]

const COMPLETED_BY_OPTIONS = [
  { label: "Parent",          value: "Parent" },
  { label: "Legal Guardian",  value: "Legal Guardian" },
  { label: "Other",           value: "Other" },
]

const YES_NO_NOTSURE = [
  { label: "Yes",      value: "Yes" },
  { label: "No",       value: "No" },
  { label: "Not sure", value: "Not sure" },
]

const YES_NO = [
  { label: "Yes", value: "Yes" },
  { label: "No",  value: "No" },
]

const MILESTONES_OPTIONS = [
  { label: "On time",  value: "On time" },
  { label: "Delayed",  value: "Delayed" },
  { label: "Not sure", value: "Not sure" },
]

const ACADEMIC_OPTIONS = [
  { label: "Above average", value: "Above average" },
  { label: "Average",       value: "Average" },
  { label: "Struggling",    value: "Struggling" },
]

// Required field IDs used for validation
const REQUIRED_FIELDS = [
  "guardianName",
  "relationshipToChild",
  "completedBy",
  "guardianPhone",
  "guardianEmail",
  "chiefConcern",
  "allergies",
  "emergencyContactName",
  "emergencyContactPhone",
]

const REQUIRED_MESSAGES = {
  guardianName:          "Please enter the guardian name.",
  relationshipToChild:   "Please select a relationship.",
  completedBy:           "Please indicate who is completing this form.",
  guardianPhone:         "Please enter a phone number.",
  guardianEmail:         "Please enter an email address.",
  chiefConcern:          "Please enter the chief concern.",
  allergies:             'Please enter allergies, or "None known".',
  emergencyContactName:  "Please enter an emergency contact name.",
  emergencyContactPhone: "Please enter an emergency contact phone.",
}

/**
 * PediatricIntakeForm — Sections A through D
 * Props:
 *   tokenData       — intakeTokens document (for pre-filling child name/dob)
 *   childFirstName  — first name for welcome text
 *   onComplete(values) — called with all form values when valid and submitted
 */
export default function PediatricIntakeForm({ tokenData, childFirstName, onComplete }) {
  const [values, setValues] = useState({
    // Section A
    guardianName:        "",
    relationshipToChild: "",
    completedBy:         "",
    childFullName:       tokenData.patientName || "",
    childDob:            tokenData.dob || "",
    childPreferredName:  "",
    guardianPhone:       "",
    guardianEmail:       "",
    // Section B
    chiefConcern:          "",
    currentConcerns:       "",
    medications:           "",
    allergies:             "",
    emergencyContactName:  "",
    emergencyContactPhone: "",
    // Section C
    pregnancyBirthComplications:       "",
    pregnancyBirthComplicationsDetail: "",
    milestones:            "",
    milestonesDetail:      "",
    earlyInterventionDiagnoses:        "",
    earlyInterventionDiagnosesDetail:  "",
    // Section D
    grade:                  "",
    schoolName:             "",
    iep504:                 "",
    academicPerformance:    "",
    schoolBehaviorConcerns: "",
  })

  // chipSelections tracks which chip button is visually selected
  // (separate from stored value for free-text chips)
  const [chipSelections, setChipSelections] = useState({})
  const [fieldErrors,    setFieldErrors]    = useState({})

  function set(id, val) {
    setValues((prev) => ({ ...prev, [id]: val }))
    if (fieldErrors[id]) {
      setFieldErrors((prev) => { const e = { ...prev }; delete e[id]; return e })
    }
  }

  function handleChipSelect(fieldId, opt) {
    setChipSelections((prev) => ({ ...prev, [fieldId]: opt.value }))
    if (!opt.freeText) {
      set(fieldId, opt.value)
    } else {
      // For free-text chips, keep existing text; will be updated on type
    }
    if (fieldErrors[fieldId]) {
      setFieldErrors((prev) => { const e = { ...prev }; delete e[fieldId]; return e })
    }
  }

  function handleChipFreeText(fieldId, text) {
    set(fieldId, text)
  }

  function validate() {
    const errors = {}
    REQUIRED_FIELDS.forEach((id) => {
      if (!values[id]?.trim()) {
        errors[id] = REQUIRED_MESSAGES[id] || "This field is required."
      }
    })
    return errors
  }

  function handleSubmit(e) {
    e.preventDefault()
    const errors = validate()
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors)
      const firstId = Object.keys(errors)[0]
      document.getElementById(`pf-${firstId}`)?.scrollIntoView({ behavior: "smooth", block: "center" })
      return
    }
    setFieldErrors({})
    onComplete(values)
  }

  // ── Shared field renderers ────────────────────
  function textField(id, label, opts = {}) {
    const err = fieldErrors[id]
    return (
      <div className="intake-field" key={id}>
        <label className="intake-label" htmlFor={`pf-${id}`}>
          {label}
          {REQUIRED_FIELDS.includes(id) && <span className="intake-label-required"> *</span>}
        </label>
        <input
          id={`pf-${id}`}
          type={opts.type || "text"}
          className={`intake-input${err ? " intake-input--error" : ""}`}
          value={values[id]}
          onChange={(e) => set(id, e.target.value)}
          placeholder={opts.placeholder || ""}
          readOnly={opts.readOnly || false}
        />
        {opts.helper && !err && <p className="intake-field-helper">{opts.helper}</p>}
        {err && <p className="intake-field-error" role="alert">{err}</p>}
      </div>
    )
  }

  function textareaField(id, label, opts = {}) {
    return (
      <div className="intake-field" key={id}>
        <label className="intake-label" htmlFor={`pf-${id}`}>{label}</label>
        <textarea
          id={`pf-${id}`}
          className="intake-textarea"
          value={values[id]}
          onChange={(e) => set(id, e.target.value)}
          placeholder={opts.placeholder || ""}
          rows={3}
        />
      </div>
    )
  }

  function chipField(id, label, options, opts = {}) {
    const err = fieldErrors[id]
    return (
      <div className="intake-field" key={id}>
        <label className="intake-label">
          {label}
          {REQUIRED_FIELDS.includes(id) && <span className="intake-label-required"> *</span>}
        </label>
        <ChipGroup
          fieldId={id}
          options={options}
          selections={chipSelections}
          onSelect={handleChipSelect}
          value={values[id]}
          onFreeText={handleChipFreeText}
        />
        {err && <p className="intake-field-error" role="alert">{err}</p>}
      </div>
    )
  }

  // Chip with a conditional detail textarea (shown when value is "Yes" or "Delayed")
  function chipWithDetail(id, label, options, detailId, detailLabel, showWhen) {
    const showDetail = showWhen.includes(values[id])
    return (
      <div className="intake-field" key={id}>
        <label className="intake-label">{label}</label>
        <ChipGroup
          fieldId={id}
          options={options}
          selections={chipSelections}
          onSelect={handleChipSelect}
          value={values[id]}
          onFreeText={handleChipFreeText}
        />
        {showDetail && (
          <div style={{ marginTop: "10px" }}>
            <label className="intake-label" htmlFor={`pf-${detailId}`}
              style={{ fontSize: "0.8rem", color: "var(--muted)" }}>{detailLabel}</label>
            <textarea
              id={`pf-${detailId}`}
              className="intake-textarea"
              value={values[detailId]}
              onChange={(e) => set(detailId, e.target.value)}
              placeholder="Please describe…"
              rows={2}
            />
          </div>
        )}
      </div>
    )
  }

  const hasErrors = Object.keys(fieldErrors).length > 0

  return (
    <form onSubmit={handleSubmit} noValidate>
      {/* Welcome banner */}
      <div className="intake-welcome-banner" style={{ marginBottom: "16px" }}>
        <p>
          You are completing this intake for <strong>{childFirstName}</strong>.
          All sections refer to your child unless otherwise noted.
        </p>
      </div>

      {/* ── Section A — Guardian and Child Information ── */}
      <div className="intake-card">
        <p className="intake-form-section-label">Section A</p>
        <h2 className="intake-section-title">Guardian and Child Information</h2>

        {textField("guardianName", "Guardian Name", { placeholder: "Full name" })}
        {chipField("relationshipToChild", "Relationship to child", RELATIONSHIP_OPTIONS)}
        {chipField("completedBy", "Who is completing this form?", COMPLETED_BY_OPTIONS)}

        <hr className="intake-divider" />
        <p className="intake-field-helper" style={{ marginBottom: "14px" }}>
          Child information below is pre-filled from the intake link.
        </p>

        {textField("childFullName", "Child Full Name", { placeholder: "Full name" })}
        {textField("childDob", "Child Date of Birth", { type: "date", readOnly: true })}
        {textField("childPreferredName", "Child Preferred Name (optional)")}
        {textField("guardianPhone", "Guardian Phone", { type: "tel", placeholder: "Phone number" })}
        {textField("guardianEmail", "Guardian Email", { type: "email", placeholder: "Email address" })}
      </div>

      {/* ── Section B — Reason for Visit ── */}
      <div className="intake-card">
        <p className="intake-form-section-label">Section B</p>
        <h2 className="intake-section-title">Reason for Visit</h2>
        <p className="intake-subtitle" style={{ marginTop: 0, marginBottom: "20px" }}>
          Your answers help your clinician prepare for your child's visit.
        </p>

        {textField("chiefConcern", "Chief Concern", { placeholder: "What brings your child in today?" })}
        {textareaField("currentConcerns", "Current Concerns (optional)",
          { placeholder: "Describe your current concerns in your own words." })}
        {textareaField("medications", "Current Medications (optional)",
          { placeholder: "List any medications your child is currently taking." })}
        {textField("allergies", "Allergies (medications, food, other)", {
          placeholder: "e.g. Penicillin — or enter: None known",
          helper: 'Enter "None known" if your child has no known allergies.',
        })}
        {textField("emergencyContactName",  "Emergency Contact Name",  { placeholder: "Full name" })}
        {textField("emergencyContactPhone", "Emergency Contact Phone", { type: "tel", placeholder: "Phone number" })}
      </div>

      {/* ── Section C — Developmental History ── */}
      <div className="intake-card">
        <p className="intake-form-section-label">Section C</p>
        <h2 className="intake-section-title">Brief Developmental History</h2>
        <p className="intake-subtitle" style={{ marginTop: 0, marginBottom: "20px" }}>
          All fields in this section are optional — answer what you know.
        </p>

        {chipWithDetail(
          "pregnancyBirthComplications",
          "Were there any pregnancy or birth complications?",
          YES_NO_NOTSURE,
          "pregnancyBirthComplicationsDetail",
          "If yes, please describe",
          ["Yes"]
        )}

        {chipWithDetail(
          "milestones",
          "Were developmental milestones (walking, talking) on time?",
          MILESTONES_OPTIONS,
          "milestonesDetail",
          "Please describe the delays",
          ["Delayed"]
        )}

        {chipWithDetail(
          "earlyInterventionDiagnoses",
          "Any early intervention or developmental diagnoses (e.g. autism, speech delay)?",
          YES_NO,
          "earlyInterventionDiagnosesDetail",
          "If yes, please describe",
          ["Yes"]
        )}
      </div>

      {/* ── Section D — School Information ── */}
      <div className="intake-card">
        <p className="intake-form-section-label">Section D</p>
        <h2 className="intake-section-title">School Information</h2>
        <p className="intake-subtitle" style={{ marginTop: 0, marginBottom: "20px" }}>
          All fields in this section are optional.
        </p>

        {textField("grade",      "Current Grade",  { placeholder: "e.g. 4th grade, 9th grade" })}
        {textField("schoolName", "School Name",    { placeholder: "School name" })}
        {chipField("iep504",             "Does your child have an IEP or 504 plan?", YES_NO_NOTSURE)}
        {chipField("academicPerformance","How is your child doing academically?",    ACADEMIC_OPTIONS)}
        {textareaField("schoolBehaviorConcerns",
          "Any behavioral concerns at school? (optional)",
          { placeholder: "Describe any behavioral concerns at school." })}
      </div>

      {hasErrors && (
        <p className="intake-error" role="alert" style={{ marginBottom: "12px" }}>
          Please complete the required fields marked above before continuing.
        </p>
      )}

      <button type="submit" className="intake-primary-btn">
        Continue to Questionnaires →
      </button>
    </form>
  )
}

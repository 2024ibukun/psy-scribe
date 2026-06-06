import StatusBadge from "./StatusBadge"

function ShieldIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      style={{ flexShrink: 0 }}
    >
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  )
}

/**
 * AssessmentCard
 *
 * Props:
 *   assessment          — object from assessments.js
 *   onSendToPatient     — optional handler; shows Coming Soon toast if omitted
 *   onSendToTeacher     — optional handler; shows Coming Soon toast if omitted
 *   onCompleteInOffice  — optional handler; shows Coming Soon toast if omitted
 *   onToast             — required toast callback
 *   hideSendToPatient   — when true, hides the "Send to Patient" button
 *   hideCompleteInOffice — when true, hides the "Complete in Office" button
 */
export default function AssessmentCard({
  assessment,
  onSendToPatient,
  onSendToTeacher,
  onCompleteInOffice,
  onToast,
  hideSendToPatient = false,
  hideCompleteInOffice = false,
}) {
  function handleSendToPatient() {
    if (onSendToPatient) onSendToPatient(assessment)
    else onToast?.("Coming Soon")
  }
  function handleSendToTeacher() {
    if (onSendToTeacher) onSendToTeacher(assessment)
    else onToast?.("Coming Soon")
  }
  function handleCompleteInOffice() {
    if (onCompleteInOffice) onCompleteInOffice(assessment)
    else onToast?.("Coming Soon")
  }

  const showSendToPatient = !hideSendToPatient
  const showSendToTeacher = assessment.hasTeacherForm === true
  const showCompleteInOffice = !hideCompleteInOffice

  return (
    <article
      className={`assessment-card${assessment.isSafety ? " assessment-card--safety" : ""}`}
    >
      <div className="assessment-card__header">
        <div className="assessment-card__title-row">
          {assessment.isSafety && (
            <span className="assessment-card__shield" aria-label="Safety assessment">
              <ShieldIcon />
            </span>
          )}
          <h3 className="assessment-card__name">{assessment.name}</h3>
          <StatusBadge status={assessment.status} />
        </div>
        {assessment.isSafety && (
          <p className="assessment-card__safety-label">Safety Assessment</p>
        )}
        <p className="assessment-card__full-name">{assessment.fullName}</p>
        <p className="assessment-card__description">{assessment.description}</p>
      </div>

      <div className="assessment-card__actions">
        {showCompleteInOffice && (
          <button
            type="button"
            className="assessment-action-btn assessment-action-btn--primary"
            onClick={handleCompleteInOffice}
          >
            Complete in Office
          </button>
        )}
        {showSendToPatient && (
          <button
            type="button"
            className="assessment-action-btn assessment-action-btn--outline"
            onClick={handleSendToPatient}
          >
            Send to Patient
          </button>
        )}
        {showSendToTeacher && (
          <button
            type="button"
            className="assessment-action-btn assessment-action-btn--outline"
            onClick={handleSendToTeacher}
          >
            Send to Teacher/Parent
          </button>
        )}
      </div>
    </article>
  )
}

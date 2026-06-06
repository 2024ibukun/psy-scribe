export default function AssessmentModeToggle({ mode, onModeChange }) {
  return (
    <div className="mode-toggle" role="group" aria-label="Patient age mode">
      <button
        type="button"
        className={`mode-toggle__btn${mode === "adult" ? " mode-toggle__btn--active" : ""}`}
        onClick={() => onModeChange("adult")}
        aria-pressed={mode === "adult"}
      >
        Adult
      </button>
      <button
        type="button"
        className={`mode-toggle__btn${mode === "pediatric" ? " mode-toggle__btn--active" : ""}`}
        onClick={() => onModeChange("pediatric")}
        aria-pressed={mode === "pediatric"}
      >
        Pediatric
      </button>
    </div>
  )
}

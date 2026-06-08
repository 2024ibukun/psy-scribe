import { useState } from "react"

// PHQ-A — Parent/Guardian Report
// 9 items, scored 0–3.
// Framing: "Over the last 2 weeks, how often has your child been bothered by..."
// Item 9: if score > 0, set phqaItem9Flag: true (clinician safety flag).
// Do NOT show any crisis message to the parent — this is a pre-visit intake form.
//
// Severity bands (same as PHQ-9):
// 0-4 Minimal · 5-9 Mild · 10-14 Moderate · 15-19 Moderately Severe · 20-27 Severe

const QUESTIONS = [
  "Little interest or pleasure in doing things",
  "Feeling down, depressed, irritable, or hopeless",
  "Trouble falling or staying asleep, or sleeping too much",
  "Poor appetite, weight loss, or overeating",
  "Feeling tired or having little energy",
  "Feeling bad about themselves, or feeling like a failure",
  "Trouble concentrating on schoolwork, reading, or watching TV",
  "Moving or speaking so slowly that others noticed — or being very fidgety or restless",
  "Thoughts that they would be better off dead, or of hurting themselves in some way",
]

const OPTIONS = [
  { label: "Not at all", value: 0 },
  { label: "Several days", value: 1 },
  { label: "More than half the days", value: 2 },
  { label: "Nearly every day", value: 3 },
]

function getSeverity(score) {
  if (score <= 4)  return "Minimal"
  if (score <= 9)  return "Mild"
  if (score <= 14) return "Moderate"
  if (score <= 19) return "Moderately Severe"
  return "Severe"
}

/**
 * PHQA — Parent/Guardian Report
 * Props:
 *   onComplete({ responses, score, severity, phqaItem9Flag })
 *   continueLabel — button text (default "Continue →")
 */
export default function PHQA({ onComplete, continueLabel = "Continue →" }) {
  const [responses, setResponses] = useState(Array(9).fill(null))

  function select(qIdx, value) {
    setResponses((prev) => {
      const next = [...prev]
      next[qIdx] = value
      return next
    })
  }

  const answered = responses.filter((r) => r !== null).length
  const allAnswered = answered === 9

  function handleContinue() {
    const score = responses.reduce((a, b) => a + b, 0)
    const severity = getSeverity(score)
    const phqaItem9Flag = responses[8] > 0
    onComplete({ responses, score, severity, phqaItem9Flag })
  }

  return (
    <div className="scale-container">
      <div className="scale-header">
        <p className="scale-instrument-label">PHQ-A — Parent/Guardian Report</p>
        <p className="scale-instruction">
          Over the <strong>last 2 weeks</strong>, how often has your child been bothered by
          any of the following?
        </p>
        <div className="scale-progress-row">
          <div className="scale-progress">
            <div className="scale-progress__bar" style={{ width: `${(answered / 9) * 100}%` }} />
          </div>
          <span className="scale-progress-label">{answered} of 9</span>
        </div>
      </div>

      {QUESTIONS.map((q, i) => (
        <div
          key={i}
          className={`scale-question${responses[i] !== null ? " scale-question--answered" : ""}`}
        >
          <p className="scale-question__text">
            <span className="scale-question__num">{i + 1}.</span> {q}
          </p>
          <div className="scale-chips">
            {OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                className={`scale-chip${responses[i] === opt.value ? " scale-chip--selected" : ""}`}
                onClick={() => select(i, opt.value)}
                aria-pressed={responses[i] === opt.value}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      ))}

      {allAnswered && (
        <button type="button" className="scale-continue-btn" onClick={handleContinue}>
          {continueLabel}
        </button>
      )}
    </div>
  )
}

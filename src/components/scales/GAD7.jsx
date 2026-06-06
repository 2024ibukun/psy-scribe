import { useState } from "react"

const QUESTIONS = [
  "Feeling nervous, anxious, or on edge",
  "Not being able to stop or control worrying",
  "Worrying too much about different things",
  "Trouble relaxing",
  "Being so restless that it is hard to sit still",
  "Becoming easily annoyed or irritable",
  "Feeling afraid as if something awful might happen",
]

const OPTIONS = [
  { label: "Not at all", value: 0 },
  { label: "Several days", value: 1 },
  { label: "More than half the days", value: 2 },
  { label: "Nearly every day", value: 3 },
]

function getSeverity(score) {
  if (score <= 4) return "Minimal"
  if (score <= 9) return "Mild"
  if (score <= 14) return "Moderate"
  return "Severe"
}

/**
 * GAD7
 * Props:
 *   onComplete({ responses, score, severity }) — called when all 7 answered and user continues
 *   continueLabel — label for the continue button (default "Continue →")
 */
export default function GAD7({ onComplete, continueLabel = "Continue →" }) {
  const [responses, setResponses] = useState(Array(7).fill(null))

  function select(qIdx, value) {
    setResponses((prev) => {
      const next = [...prev]
      next[qIdx] = value
      return next
    })
  }

  const answered = responses.filter((r) => r !== null).length
  const allAnswered = answered === 7

  function handleContinue() {
    const score = responses.reduce((a, b) => a + b, 0)
    const severity = getSeverity(score)
    onComplete({ responses, score, severity })
  }

  return (
    <div className="scale-container">
      <div className="scale-header">
        <p className="scale-instrument-label">GAD-7 — Generalized Anxiety Disorder Scale</p>
        <p className="scale-instruction">
          Over the <strong>last 2 weeks</strong>, how often have you been bothered by the following problems?
        </p>
        <div className="scale-progress-row">
          <div className="scale-progress">
            <div
              className="scale-progress__bar"
              style={{ width: `${(answered / 7) * 100}%` }}
            />
          </div>
          <span className="scale-progress-label">{answered} of 7</span>
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
        <button
          type="button"
          className="scale-continue-btn"
          onClick={handleContinue}
        >
          {continueLabel}
        </button>
      )}
    </div>
  )
}

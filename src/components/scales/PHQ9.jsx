import { useState } from "react"

const QUESTIONS = [
  "Little interest or pleasure in doing things",
  "Feeling down, depressed, or hopeless",
  "Trouble falling or staying asleep, or sleeping too much",
  "Feeling tired or having little energy",
  "Poor appetite or overeating",
  "Feeling bad about yourself — or that you are a failure or have let yourself or your family down",
  "Trouble concentrating on things, such as reading the newspaper or watching television",
  "Moving or speaking so slowly that other people could have noticed — or being so fidgety or restless that you have been moving around a lot more than usual",
  "Thoughts that you would be better off dead, or of hurting yourself in some way",
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
  if (score <= 19) return "Moderately Severe"
  return "Severe"
}

/**
 * PHQ9
 * Props:
 *   onComplete({ responses, score, severity, phq9Q9Flag }) — called when all 9 answered and user continues
 *   continueLabel — label for the continue button (default "Continue →")
 */
export default function PHQ9({ onComplete, continueLabel = "Continue →" }) {
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
    const phq9Q9Flag = responses[8] > 0
    onComplete({ responses, score, severity, phq9Q9Flag })
  }

  return (
    <div className="scale-container">
      <div className="scale-header">
        <p className="scale-instrument-label">PHQ-9 — Patient Health Questionnaire</p>
        <p className="scale-instruction">
          Over the <strong>last 2 weeks</strong>, how often have you been bothered by any of the following problems?
        </p>
        <div className="scale-progress-row">
          <div className="scale-progress">
            <div
              className="scale-progress__bar"
              style={{ width: `${(answered / 9) * 100}%` }}
            />
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

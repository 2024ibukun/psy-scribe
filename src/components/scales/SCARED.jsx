import { useState } from "react"

// SCARED — Abbreviated Parent-Report Anxiety Screen (5-item version)
//
// This is a 5-item abbreviated parent-report screen derived from the
// Screen for Child Anxiety Related Emotional Disorders (Birmaher et al.).
// Items were selected to cover the main SCARED subscales:
//   1. Somatic/panic (hard to breathe when frightened)
//   2. Social anxiety (uncomfortable around strangers)
//   3. Separation anxiety (worried about being away from home)
//   4. Generalized worry (worries about many things)
//   5. School anxiety (nervous/worried at school or activities)
//
// Scoring: 0 (Not true), 1 (Somewhat true), 2 (Very true)
// Total: 0–10
// Cutoff: ≥3 = "Elevated — anxiety symptoms may be present; clinical assessment recommended"
//         <3  = "Below screening threshold"
//
// This abbreviated screen is for initial clinical intake only.
// A positive result should prompt a full clinical evaluation.
// The raw score and interpretation are stored for the clinician.

const QUESTIONS = [
  "When my child is frightened, it is hard for them to breathe",
  "My child does not like to be around people they don't know well",
  "My child worries about being away from home",
  "My child worries about doing well in school or other activities",
  "My child seems nervous, tense, or worried a lot of the time",
]

const OPTIONS = [
  { label: "Not true", value: 0 },
  { label: "Somewhat true", value: 1 },
  { label: "Very true", value: 2 },
]

function getInterpretation(score) {
  if (score >= 3) return "Elevated — anxiety symptoms may be present"
  return "Below screening threshold"
}

/**
 * SCARED (5-item abbreviated parent-report)
 * Props:
 *   onComplete({ responses, score, interpretation })
 *   continueLabel — button text (default "Continue →")
 */
export default function SCARED({ onComplete, continueLabel = "Continue →" }) {
  const [responses, setResponses] = useState(Array(5).fill(null))

  function select(qIdx, value) {
    setResponses((prev) => {
      const next = [...prev]
      next[qIdx] = value
      return next
    })
  }

  const answered = responses.filter((r) => r !== null).length
  const allAnswered = answered === 5

  function handleContinue() {
    const score = responses.reduce((a, b) => a + b, 0)
    const interpretation = getInterpretation(score)
    onComplete({ responses, score, interpretation })
  }

  return (
    <div className="scale-container">
      <div className="scale-header">
        <p className="scale-instrument-label">SCARED — Parent/Guardian Report (abbreviated screen)</p>
        <p className="scale-instruction">
          Based on what you have observed, how true is each statement about your child?
        </p>
        <div className="scale-progress-row">
          <div className="scale-progress">
            <div className="scale-progress__bar" style={{ width: `${(answered / 5) * 100}%` }} />
          </div>
          <span className="scale-progress-label">{answered} of 5</span>
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

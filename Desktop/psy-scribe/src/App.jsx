import { useEffect, useMemo, useState } from 'react'
import './App.css'

const storageKey = 'iscribe.assessments.v1'

const likert4 = [
  { label: 'Not at all', value: 0 },
  { label: 'Several days', value: 1 },
  { label: 'More than half the days', value: 2 },
  { label: 'Nearly every day', value: 3 },
]

const pclOptions = [
  { label: 'Not at all', value: 0 },
  { label: 'A little bit', value: 1 },
  { label: 'Moderately', value: 2 },
  { label: 'Quite a bit', value: 3 },
  { label: 'Extremely', value: 4 },
]

const scoreOnlyOptions = Array.from({ length: 81 }, (_, value) => ({
  label: String(value),
  value,
}))

function bandFor(score, bands) {
  return bands.find((band) => score >= band.min && score <= band.max) ?? bands[0]
}

function sumAnswers(answers) {
  return Object.values(answers).reduce((total, value) => total + Number(value || 0), 0)
}

const measures = [
  {
    id: 'phq-9',
    title: 'PHQ-9',
    ageGroup: 'adult',
    respondent: 'patient',
    copyrightStatus: 'free',
    instructions:
      'Over the last two weeks, rate how often each depression symptom has bothered the patient.',
    options: likert4,
    items: [
      { id: 'phq1', text: 'Little interest or pleasure in doing things' },
      { id: 'phq2', text: 'Feeling down, depressed, or hopeless' },
      { id: 'phq3', text: 'Sleep difficulty or sleeping too much' },
      { id: 'phq4', text: 'Low energy or fatigue' },
      { id: 'phq5', text: 'Poor appetite or overeating' },
      { id: 'phq6', text: 'Feeling bad about yourself or feeling like a failure' },
      { id: 'phq7', text: 'Trouble concentrating' },
      { id: 'phq8', text: 'Moving or speaking slowly, or being unusually restless' },
      { id: 'phq9', text: 'Thoughts of self-harm or being better off dead' },
    ],
    scoring: (answers) => ({ totalScore: sumAnswers(answers), subscaleScores: {} }),
    severityBands: [
      { min: 0, max: 4, label: 'Minimal' },
      { min: 5, max: 9, label: 'Mild' },
      { min: 10, max: 14, label: 'Moderate' },
      { min: 15, max: 19, label: 'Moderately severe' },
      { min: 20, max: 27, label: 'Severe' },
    ],
    redFlagRules: [
      {
        label: 'Suicide assessment alert',
        when: (answers) => Number(answers.phq9 || 0) > 0,
      },
      {
        label: 'Clinical review alert for severe depression',
        when: (_, score) => score >= 20,
      },
    ],
    references: [
      {
        label: 'PHQ Screeners',
        url: 'https://www.phqscreeners.com/',
      },
    ],
  },
  {
    id: 'gad-7',
    title: 'GAD-7',
    ageGroup: 'adult',
    respondent: 'patient',
    copyrightStatus: 'free',
    instructions: 'Over the last two weeks, rate anxiety symptoms.',
    options: likert4,
    items: [
      { id: 'gad1', text: 'Feeling nervous, anxious, or on edge' },
      { id: 'gad2', text: 'Not being able to stop or control worrying' },
      { id: 'gad3', text: 'Worrying too much about different things' },
      { id: 'gad4', text: 'Trouble relaxing' },
      { id: 'gad5', text: 'Being so restless that it is hard to sit still' },
      { id: 'gad6', text: 'Becoming easily annoyed or irritable' },
      { id: 'gad7', text: 'Feeling afraid as if something awful might happen' },
    ],
    scoring: (answers) => ({ totalScore: sumAnswers(answers), subscaleScores: {} }),
    severityBands: [
      { min: 0, max: 4, label: 'Minimal' },
      { min: 5, max: 9, label: 'Mild' },
      { min: 10, max: 14, label: 'Moderate' },
      { min: 15, max: 21, label: 'Severe' },
    ],
    redFlagRules: [
      {
        label: 'Clinical review alert for severe anxiety',
        when: (_, score) => score >= 15,
      },
    ],
    references: [{ label: 'PHQ Screeners', url: 'https://www.phqscreeners.com/' }],
  },
  {
    id: 'pcl-5',
    title: 'PCL-5',
    ageGroup: 'adult',
    respondent: 'patient',
    copyrightStatus: 'free',
    instructions:
      'Rate how much PTSD symptoms have bothered the patient in the past month. This app uses brief symptom stems for workflow demonstration.',
    options: pclOptions,
    items: [
      { id: 'pcl1', text: 'Intrusive memories, dreams, or flashbacks' },
      { id: 'pcl2', text: 'Avoidance of reminders or thoughts' },
      { id: 'pcl3', text: 'Negative beliefs, blame, fear, guilt, or disconnection' },
      { id: 'pcl4', text: 'Irritability, hypervigilance, startle, or sleep difficulty' },
      { id: 'pcl5', text: 'Concentration problems or risky behavior' },
    ],
    scoring: (answers) => ({ totalScore: sumAnswers(answers), subscaleScores: {} }),
    severityBands: [
      { min: 0, max: 30, label: 'Below common screen threshold' },
      { min: 31, max: 39, label: 'Elevated' },
      { min: 40, max: 80, label: 'Severe range' },
    ],
    redFlagRules: [
      {
        label: 'Clinical review alert for severe PTSD symptoms',
        when: (_, score) => score >= 40,
      },
    ],
    references: [
      {
        label: 'VA National Center for PTSD',
        url: 'https://www.ptsd.va.gov/professional/assessment/adult-sr/ptsd-checklist.asp',
      },
    ],
  },
  {
    id: 'c-ssrs',
    title: 'C-SSRS Screener',
    ageGroup: 'all',
    respondent: 'clinician',
    copyrightStatus: 'score-only',
    instructions:
      'Enter whether the administered C-SSRS indicated suicidal ideation or behavior. Item text is intentionally not reproduced.',
    options: [
      { label: 'No', value: 0 },
      { label: 'Yes', value: 1 },
    ],
    items: [
      { id: 'ideation', text: 'Positive suicidal ideation finding' },
      { id: 'behavior', text: 'Positive suicidal behavior finding' },
    ],
    scoring: (answers) => ({
      totalScore: Number(answers.ideation || 0) + Number(answers.behavior || 0),
      subscaleScores: {
        ideation: Number(answers.ideation || 0),
        behavior: Number(answers.behavior || 0),
      },
    }),
    severityBands: [
      { min: 0, max: 0, label: 'No positive screen entered' },
      { min: 1, max: 2, label: 'Positive safety screen' },
    ],
    redFlagRules: [
      {
        label: 'Safety workflow alert',
        when: (_, score) => score > 0,
      },
    ],
    references: [{ label: 'The Columbia Lighthouse Project', url: 'https://cssrs.columbia.edu/' }],
  },
  {
    id: 'vanderbilt',
    title: 'Vanderbilt ADHD Rating Scale',
    ageGroup: 'child',
    respondent: 'parent',
    copyrightStatus: 'score-only',
    instructions:
      'Score-only workflow for Vanderbilt results. Enter the total or clinic-approved calculated score after administering the original instrument.',
    options: scoreOnlyOptions,
    items: [{ id: 'score', text: 'Entered total score' }],
    scoring: (answers) => ({ totalScore: Number(answers.score || 0), subscaleScores: {} }),
    severityBands: [
      { min: 0, max: 17, label: 'Lower entered score' },
      { min: 18, max: 80, label: 'Elevated entered score' },
    ],
    redFlagRules: [],
    references: [{ label: 'NICHQ Vanderbilt resources', url: 'https://nichq.org/downloadable/nichq-vanderbilt-assessment-scales/' }],
  },
  {
    id: 'snap-iv',
    title: 'SNAP-IV',
    ageGroup: 'child',
    respondent: 'teacher',
    copyrightStatus: 'score-only',
    instructions:
      'Score-only page. Enter results from a properly licensed or clinic-approved SNAP-IV administration.',
    options: scoreOnlyOptions,
    items: [{ id: 'score', text: 'Entered total score' }],
    scoring: (answers) => ({ totalScore: Number(answers.score || 0), subscaleScores: {} }),
    severityBands: [
      { min: 0, max: 25, label: 'Lower entered score' },
      { min: 26, max: 80, label: 'Elevated entered score' },
    ],
    redFlagRules: [],
    references: [{ label: 'SNAP-IV overview', url: 'https://www.caddra.ca/' }],
  },
  {
    id: 'scared',
    title: 'SCARED',
    ageGroup: 'child',
    respondent: 'patient',
    copyrightStatus: 'score-only',
    instructions:
      'Score-only page. Enter total score after administering the original SCARED questionnaire.',
    options: scoreOnlyOptions,
    items: [{ id: 'score', text: 'Entered total score' }],
    scoring: (answers) => ({ totalScore: Number(answers.score || 0), subscaleScores: {} }),
    severityBands: [
      { min: 0, max: 24, label: 'Below common screen threshold' },
      { min: 25, max: 80, label: 'Elevated entered score' },
    ],
    redFlagRules: [
      {
        label: 'Clinical review alert for severe anxiety',
        when: (_, score) => score >= 60,
      },
    ],
    references: [{ label: 'SCARED publication record', url: 'https://pubmed.ncbi.nlm.nih.gov/9639084/' }],
  },
  {
    id: 'cy-bocs',
    title: 'CY-BOCS',
    ageGroup: 'child',
    respondent: 'clinician',
    copyrightStatus: 'score-only',
    instructions:
      'Score-only page. Enter CY-BOCS total score after administering the original clinician-rated instrument.',
    options: Array.from({ length: 41 }, (_, value) => ({ label: String(value), value })),
    items: [{ id: 'score', text: 'Entered total score' }],
    scoring: (answers) => ({ totalScore: Number(answers.score || 0), subscaleScores: {} }),
    severityBands: [
      { min: 0, max: 7, label: 'Subclinical' },
      { min: 8, max: 15, label: 'Mild' },
      { min: 16, max: 23, label: 'Moderate' },
      { min: 24, max: 31, label: 'Severe' },
      { min: 32, max: 40, label: 'Extreme' },
    ],
    redFlagRules: [
      {
        label: 'Clinical review alert for severe OCD symptoms',
        when: (_, score) => score >= 24,
      },
    ],
    references: [{ label: 'CY-BOCS publication record', url: 'https://pubmed.ncbi.nlm.nih.gov/9046541/' }],
  },
]

function evaluateMeasure(measure, answers) {
  const scored = measure.scoring(answers)
  const severity = bandFor(scored.totalScore, measure.severityBands)
  const redFlags = measure.redFlagRules
    .filter((rule) => rule.when(answers, scored.totalScore, scored.subscaleScores))
    .map((rule) => rule.label)

  return { ...scored, severity: severity.label, redFlags }
}

function QuestionnaireEngine({ measure, onSave }) {
  const [answers, setAnswers] = useState({})
  const result = useMemo(() => evaluateMeasure(measure, answers), [answers, measure])

  useEffect(() => {
    setAnswers({})
  }, [measure.id])

  const complete = measure.items.every((item) => answers[item.id] !== undefined)

  function updateAnswer(itemId, value) {
    setAnswers((current) => ({ ...current, [itemId]: Number(value) }))
  }

  function saveResult() {
    const payload = {
      patientId: 'local-demo-patient',
      encounterId: `enc-${new Date().toISOString().slice(0, 10)}`,
      scaleId: measure.id,
      respondent: measure.respondent,
      answers,
      totalScore: result.totalScore,
      subscaleScores: result.subscaleScores,
      severity: result.severity,
      redFlags: result.redFlags,
      createdAt: new Date().toISOString(),
      createdBy: 'local-clinician-demo',
    }
    onSave(payload)
  }

  return (
    <section className="engine-panel" aria-labelledby="engine-title">
      <div className="engine-head">
        <div>
          <p className="eyebrow">Questionnaire engine</p>
          <h2 id="engine-title">{measure.title}</h2>
          <p>{measure.instructions}</p>
        </div>
        <div className="score-chip">
          <span>{result.totalScore}</span>
          <small>{result.severity}</small>
        </div>
      </div>

      <div className="meta-grid">
        <span>Age: {measure.ageGroup}</span>
        <span>Respondent: {measure.respondent}</span>
        <span>Status: {measure.copyrightStatus}</span>
      </div>

      <div className="questions">
        {measure.items.map((item, index) => (
          <fieldset className="question-row" key={item.id}>
            <legend>
              <span>{index + 1}</span>
              {item.text}
            </legend>
            <div className="option-grid">
              {measure.options.map((option) => (
                <label
                  className={answers[item.id] === option.value ? 'option active' : 'option'}
                  key={`${item.id}-${option.value}`}
                >
                  <input
                    checked={answers[item.id] === option.value}
                    name={item.id}
                    onChange={() => updateAnswer(item.id, option.value)}
                    type="radio"
                  />
                  <span>{option.label}</span>
                </label>
              ))}
            </div>
          </fieldset>
        ))}
      </div>

      {result.redFlags.length > 0 && (
        <div className="alert-stack" role="alert">
          {result.redFlags.map((flag) => (
            <strong key={flag}>{flag}</strong>
          ))}
        </div>
      )}

      <div className="engine-actions">
        <button disabled={!complete} onClick={saveResult} type="button">
          Save local result
        </button>
        <button onClick={() => setAnswers({})} type="button">
          Clear answers
        </button>
      </div>
    </section>
  )
}

function TrendGraph({ results, selectedIds }) {
  const plotted = results
    .filter((result) => selectedIds.includes(result.scaleId))
    .slice(-18)
    .map((result, index) => ({ ...result, index }))
  const maxScore = Math.max(10, ...plotted.map((result) => result.totalScore))

  return (
    <section className="trend-panel" aria-labelledby="trend-title">
      <div>
        <p className="eyebrow">Longitudinal view</p>
        <h2 id="trend-title">Trend graphs over time</h2>
      </div>
      <svg className="trend-svg" viewBox="0 0 720 220" role="img" aria-label="Assessment score trends">
        <line x1="42" x2="690" y1="184" y2="184" />
        <line x1="42" x2="42" y1="22" y2="184" />
        {plotted.map((result, index) => {
          const x = 56 + index * (620 / Math.max(plotted.length - 1, 1))
          const y = 184 - (result.totalScore / maxScore) * 148
          return (
            <g key={`${result.createdAt}-${index}`}>
              <circle cx={x} cy={y} r="6" />
              <text x={x} y={y - 12}>
                {result.totalScore}
              </text>
            </g>
          )
        })}
      </svg>
      <div className="trend-legend">
        {selectedIds.map((id) => (
          <span key={id}>{measures.find((measure) => measure.id === id)?.title}</span>
        ))}
      </div>
    </section>
  )
}

function App() {
  const [activeMeasureId, setActiveMeasureId] = useState('phq-9')
  const [results, setResults] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem(storageKey)) ?? []
    } catch {
      return []
    }
  })

  const activeMeasure = measures.find((measure) => measure.id === activeMeasureId) ?? measures[0]
  const selectedTrendIds = ['phq-9', 'gad-7', 'pcl-5', 'vanderbilt', 'snap-iv', 'scared', 'cy-bocs']
  const latestResult = results[0]

  useEffect(() => {
    localStorage.setItem(storageKey, JSON.stringify(results))
  }, [results])

  function saveResult(result) {
    setResults((current) => [result, ...current])
  }

  function noteText(result = latestResult) {
    if (!result) return 'No local assessment result has been saved yet.'
    const measure = measures.find((item) => item.id === result.scaleId)
    const flags = result.redFlags.length ? ` Red flags: ${result.redFlags.join('; ')}.` : ''
    return `${measure?.title ?? result.scaleId}: ${result.totalScore}, severity ${result.severity}.${flags} Screening results support clinical judgment and do not replace diagnosis.`
  }

  async function copyNote() {
    await navigator.clipboard.writeText(noteText())
  }

  function exportPdf() {
    const printWindow = window.open('', '_blank')
    if (!printWindow) return
    printWindow.document.write(`<pre>${noteText()}</pre>`)
    printWindow.document.close()
    printWindow.print()
  }

  return (
    <main className="app-shell">
      <header className="app-header">
        <nav className="topbar" aria-label="Primary navigation">
          <a className="brand" href="https://iscribe.app">iscribe.app</a>
          <div className="nav-links">
            <a href="#engine">Assess</a>
            <a href="#trends">Trends</a>
            <a href="#exports">Exports</a>
          </div>
        </nav>
        <div className="hero-copy">
          <p className="eyebrow">Psychiatry scribe and psychometrics</p>
          <h1>Structured measures, alerts, and note-ready summaries.</h1>
          <p>
            This local prototype keeps assessment data in the browser only and is not configured for PHI.
            Future storage is designed around users, patients, encounters, assessments, assessment templates,
            and audit logs.
          </p>
        </div>
      </header>

      <section className="workspace" id="engine">
        <aside className="measure-sidebar" aria-label="Assessment templates">
          {measures.map((measure) => (
            <button
              className={measure.id === activeMeasureId ? 'measure-button active' : 'measure-button'}
              key={measure.id}
              onClick={() => setActiveMeasureId(measure.id)}
              type="button"
            >
              <span>{measure.title}</span>
              <small>{measure.ageGroup} / {measure.respondent}</small>
            </button>
          ))}
        </aside>
        <QuestionnaireEngine measure={activeMeasure} onSave={saveResult} />
      </section>

      <section className="lower-grid" id="trends">
        <TrendGraph results={results} selectedIds={selectedTrendIds} />

        <section className="export-panel" id="exports" aria-labelledby="export-title">
          <p className="eyebrow">Export and note tools</p>
          <h2 id="export-title">Clinician-ready output</h2>
          <textarea readOnly value={noteText()} />
          <div className="engine-actions">
            <button onClick={copyNote} type="button">Copy note</button>
            <button onClick={exportPdf} type="button">PDF summary</button>
          </div>
          <div className="role-strip">
            <span>Clinician</span>
            <span>Staff</span>
            <span>Parent or teacher</span>
            <span>Patient portal</span>
          </div>
        </section>
      </section>

      <section className="reference-panel" aria-labelledby="reference-title">
        <div>
          <p className="eyebrow">Clinical governance</p>
          <h2 id="reference-title">Attribution, scope, and safety</h2>
          <p>
            Screening tools support clinical judgment and do not replace diagnostic evaluation,
            risk assessment, emergency care, or individualized treatment planning.
          </p>
        </div>
        <ul>
          {measures.map((measure) => (
            <li key={measure.id}>
              <strong>{measure.title}</strong>
              {measure.references.map((reference) => (
                <a href={reference.url} key={reference.url} rel="noreferrer" target="_blank">
                  {reference.label}
                </a>
              ))}
            </li>
          ))}
        </ul>
      </section>
    </main>
  )
}

export default App

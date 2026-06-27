import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { doc, getDoc } from 'firebase/firestore'
import { db } from '../../firebase'
import { PARENT_SECTIONS, TEACHER_SECTIONS, SYMPTOM_OPTIONS, PERFORMANCE_OPTIONS } from '../../data/vanderbilt'

function FlagBadge({ label, positive }) {
  if (!positive) return null
  return <span className="vand-flag-badge">{label}</span>
}

function ScoreRow({ label, score, positive, threshold, max }) {
  return (
    <div className={`vand-score-row${positive ? ' vand-score-row--positive' : ''}`}>
      <span className="vand-score-row__label">{label}</span>
      <span className="vand-score-row__value">
        {score}{max !== undefined ? `/${max}` : ''}
        {threshold !== undefined && (
          <span className="vand-score-row__threshold">(threshold: ≥{threshold})</span>
        )}
      </span>
      {positive && <span className="vand-score-row__flag">▲</span>}
    </div>
  )
}

function SubscaleCard({ title, scores, flags, respondent }) {
  if (!scores) {
    return (
      <div className="vand-subscale-card vand-subscale-card--empty">
        <h3 className="vand-subscale-card__title">{respondent}</h3>
        <p className="vand-subscale-card__pending">Not yet submitted</p>
      </div>
    )
  }

  const isParent = respondent === 'Parent'

  return (
    <div className={`vand-subscale-card${flags?.overallADHDPositive ? ' vand-subscale-card--positive' : ''}`}>
      <h3 className="vand-subscale-card__title">{respondent}</h3>

      {flags?.overallADHDPositive && (
        <div className="vand-adhd-screen-banner">
          <strong>Positive ADHD Screen</strong>
          <span>Criteria met for symptom threshold + performance impairment</span>
        </div>
      )}

      <div className="vand-score-list">
        <ScoreRow
          label="Inattention"
          score={scores.inattention}
          positive={flags?.inattentionPositive}
          threshold={6}
          max={9}
        />
        <ScoreRow
          label="Hyperactivity / Impulsivity"
          score={scores.hyperactivity}
          positive={flags?.hyperactivityPositive}
          threshold={6}
          max={9}
        />
        {isParent ? (
          <>
            <ScoreRow
              label="Oppositional Defiant"
              score={scores.odd}
              positive={flags?.oddPositive}
              threshold={4}
              max={8}
            />
            <ScoreRow
              label="Conduct Disorder"
              score={scores.conduct}
              positive={flags?.conductPositive}
              threshold={3}
              max={14}
            />
          </>
        ) : (
          <ScoreRow
            label="Oppositional / Conduct"
            score={scores.oddConduct}
            positive={flags?.oddConductPositive}
            threshold={3}
            max={10}
          />
        )}
        <ScoreRow
          label="Anxiety / Depression"
          score={scores.anxiety}
          positive={flags?.anxietyPositive}
          threshold={3}
          max={isParent ? 7 : 7}
        />
        <ScoreRow
          label="Performance impairment items"
          score={scores.performanceImpairmentCount}
          positive={flags?.performanceImpaired}
        />
        <div className="vand-score-row">
          <span className="vand-score-row__label">Avg performance score</span>
          <span className="vand-score-row__value">
            {scores.avgPerformance}
            <span className="vand-score-row__threshold">(1=best, 5=worst)</span>
          </span>
        </div>
      </div>
    </div>
  )
}

function ResponseDetail({ sections, responses, label }) {
  if (!responses) {
    return <p className="vand-no-responses">No responses submitted yet.</p>
  }

  let qOffset = 0
  return (
    <div className="vand-response-detail">
      <h3 className="vand-response-detail__title">{label} Responses</h3>
      {sections.map((section) => (
        <div key={section.id} className="vand-response-section">
          <h4 className="vand-response-section__title">{section.title}</h4>
          {section.questions.map((text, i) => {
            const qNum = qOffset + i + 1
            const val  = responses[`q${qNum}`]
            const options = section.type === 'performance' ? PERFORMANCE_OPTIONS : SYMPTOM_OPTIONS
            const optLabel = options.find((o) => o.value === val)?.label ?? '—'
            const flagged = section.type === 'symptom' && val >= 2
            return (
              <div key={qNum} className={`vand-response-item${flagged ? ' vand-response-item--flagged' : ''}`}>
                <span className="vand-response-item__num">{qNum}.</span>
                <span className="vand-response-item__text">{text}</span>
                <span className={`vand-response-item__answer${flagged ? ' vand-response-item__answer--flagged' : ''}`}>
                  {optLabel}
                </span>
              </div>
            )
          })}
          {(qOffset += section.questions.length) && null}
        </div>
      ))}
    </div>
  )
}

function generateSummaryText({ assessment, parentForm, teacherForm }) {
  const lines = []
  const name = assessment.childName || 'Patient'

  lines.push(`Vanderbilt ADHD Rating Scale — ${name}`)
  lines.push(`Grade: ${assessment.gradeLevel || 'N/A'} | On medication: ${assessment.onMedication ? 'Yes' : 'No'}`)
  lines.push('')

  function renderScores(label, scores, flags) {
    if (!scores) { lines.push(`${label}: Not yet submitted`); return }
    lines.push(`${label}:`)
    lines.push(`  Inattention: ${scores.inattention}/9${flags?.inattentionPositive ? ' [POSITIVE ≥6]' : ''}`)
    lines.push(`  Hyperactivity/Impulsivity: ${scores.hyperactivity}/9${flags?.hyperactivityPositive ? ' [POSITIVE ≥6]' : ''}`)
    if (label === 'Parent') {
      lines.push(`  Oppositional Defiant: ${scores.odd}/8${flags?.oddPositive ? ' [POSITIVE ≥4]' : ''}`)
      lines.push(`  Conduct Disorder: ${scores.conduct}/14${flags?.conductPositive ? ' [POSITIVE ≥3]' : ''}`)
    } else {
      lines.push(`  Oppositional/Conduct: ${scores.oddConduct}/10${flags?.oddConductPositive ? ' [POSITIVE ≥3]' : ''}`)
    }
    lines.push(`  Anxiety/Depression: ${scores.anxiety}/7${flags?.anxietyPositive ? ' [POSITIVE ≥3]' : ''}`)
    lines.push(`  Performance impairment items: ${scores.performanceImpairmentCount} | Avg performance: ${scores.avgPerformance}/5`)
    lines.push(`  Overall ADHD screen: ${flags?.overallADHDPositive ? 'POSITIVE' : 'Negative'}`)
  }

  renderScores('Parent', parentForm?.scores, parentForm?.scores?.flags)
  lines.push('')
  renderScores('Teacher', teacherForm?.scores, teacherForm?.scores?.flags)

  if (parentForm?.comments) {
    lines.push('')
    lines.push(`Parent comments: ${parentForm.comments}`)
  }
  if (teacherForm?.comments) {
    lines.push('')
    lines.push(`Teacher comments: ${teacherForm.comments}`)
  }

  lines.push('')
  lines.push('Note: Vanderbilt results are informational and require clinician interpretation.')

  return lines.join('\n')
}

export default function VanderbiltResults() {
  const { id } = useParams()
  const navigate = useNavigate()

  const [assessment,  setAssessment]  = useState(null)
  const [parentForm,  setParentForm]  = useState(null)
  const [teacherForm, setTeacherForm] = useState(null)
  const [loading,     setLoading]     = useState(true)
  const [error,       setError]       = useState('')
  const [showParentDetail,  setShowParentDetail]  = useState(false)
  const [showTeacherDetail, setShowTeacherDetail] = useState(false)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    async function load() {
      try {
        const snap = await getDoc(doc(db, 'vanderbiltAssessments', id))
        if (!snap.exists()) { setError('Assessment not found.'); setLoading(false); return }
        const data = { id: snap.id, ...snap.data() }
        setAssessment(data)

        const fetches = []
        if (data.parentLinkId)  fetches.push(getDoc(doc(db, 'vanderbiltParentForms', data.parentLinkId)))
        if (data.teacherLinkId) fetches.push(getDoc(doc(db, 'vanderbiltTeacherForms', data.teacherLinkId)))

        const results = await Promise.all(fetches)
        if (data.parentLinkId  && results[0]?.exists()) setParentForm(results[0].data())
        if (data.teacherLinkId && results[data.parentLinkId ? 1 : 0]?.exists()) setTeacherForm(results[data.parentLinkId ? 1 : 0].data())
      } catch (err) {
        console.error(err)
        setError('Failed to load results. Please try again.')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [id])

  function handleCopySummary() {
    if (!assessment) return
    const text = generateSummaryText({ assessment, parentForm, teacherForm })
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  function formatDate(ts) {
    if (!ts) return '—'
    const d = ts.toDate ? ts.toDate() : new Date(ts.seconds * 1000)
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  }

  if (loading) {
    return (
      <div className="vand-results-shell">
        <p className="vand-loading">Loading results…</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="vand-results-shell">
        <p className="vand-error">{error}</p>
        <button type="button" className="intake-primary-btn" onClick={() => navigate('/workspace/vanderbilt')}>
          Back to Vanderbilt
        </button>
      </div>
    )
  }

  const parentScores   = parentForm?.scores
  const parentFlags    = parentScores?.flags
  const teacherScores  = teacherForm?.scores
  const teacherFlags   = teacherScores?.flags
  const eitherPositive = parentFlags?.overallADHDPositive || teacherFlags?.overallADHDPositive

  return (
    <div className="vand-results-shell">
      <div className="vand-results-header">
        <div>
          <button type="button" className="vand-back-btn" onClick={() => navigate('/workspace/vanderbilt')}>
            ← Vanderbilt
          </button>
          <h1 className="vand-results-title">{assessment.childName}</h1>
          <p className="vand-results-meta">
            Grade {assessment.gradeLevel}
            {assessment.onMedication ? ' · On medication' : ''}
            {' · '}Sent {formatDate(assessment.createdAt)}
          </p>
        </div>
        <div className="vand-results-actions">
          <button type="button" className="intake-primary-btn" onClick={handleCopySummary}>
            {copied ? 'Copied!' : 'Copy Summary'}
          </button>
        </div>
      </div>

      {eitherPositive && (
        <div className="vand-screen-banner">
          <strong>Positive ADHD Screen</strong>
          <span>
            {[parentFlags?.overallADHDPositive && 'Parent', teacherFlags?.overallADHDPositive && 'Teacher']
              .filter(Boolean).join(' and ')} report meets ADHD symptom + performance impairment criteria.
            Clinical judgement required.
          </span>
        </div>
      )}

      <div className="vand-subscale-grid">
        <SubscaleCard
          title="Parent"
          respondent="Parent"
          scores={parentScores}
          flags={parentFlags}
        />
        <SubscaleCard
          title="Teacher"
          respondent="Teacher"
          scores={teacherScores}
          flags={teacherFlags}
        />
      </div>

      {/* Submission details */}
      <div className="vand-respondent-details">
        {assessment.parentLinkId && (
          <div className="vand-respondent-detail">
            <span className="vand-respondent-detail__label">Parent:</span>
            <span>{assessment.parentName || '—'}</span>
            <span className={`vand-status-badge ${parentForm ? 'vand-status-badge--done' : 'vand-status-badge--pending'}`}>
              {parentForm ? `Submitted ${formatDate(parentForm.submittedAt)}` : 'Pending'}
            </span>
          </div>
        )}
        {assessment.teacherLinkId && (
          <div className="vand-respondent-detail">
            <span className="vand-respondent-detail__label">Teacher:</span>
            <span>{assessment.teacherName || '—'}{assessment.teacherClass ? ` · ${assessment.teacherClass}` : ''}</span>
            <span className={`vand-status-badge ${teacherForm ? 'vand-status-badge--done' : 'vand-status-badge--pending'}`}>
              {teacherForm ? `Submitted ${formatDate(teacherForm.submittedAt)}` : 'Pending'}
            </span>
          </div>
        )}
      </div>

      {/* Comments */}
      {(parentForm?.comments || teacherForm?.comments) && (
        <div className="vand-comments-section">
          <h2 className="vand-comments-title">Comments</h2>
          {parentForm?.comments && (
            <div className="vand-comment-block">
              <p className="vand-comment-label">Parent</p>
              <p className="vand-comment-text">{parentForm.comments}</p>
            </div>
          )}
          {teacherForm?.comments && (
            <div className="vand-comment-block">
              <p className="vand-comment-label">Teacher</p>
              <p className="vand-comment-text">{teacherForm.comments}</p>
            </div>
          )}
        </div>
      )}

      {/* Detailed responses toggle */}
      {parentForm?.responses && (
        <div className="vand-detail-section">
          <button
            type="button"
            className="intake-reviewed-toggle-header"
            onClick={() => setShowParentDetail((v) => !v)}
          >
            <span>Parent — All Responses</span>
            <span className="intake-reviewed-chevron">{showParentDetail ? '▲' : '▼'}</span>
          </button>
          {showParentDetail && (
            <ResponseDetail
              sections={PARENT_SECTIONS}
              responses={parentForm.responses}
              label="Parent"
            />
          )}
        </div>
      )}

      {teacherForm?.responses && (
        <div className="vand-detail-section">
          <button
            type="button"
            className="intake-reviewed-toggle-header"
            onClick={() => setShowTeacherDetail((v) => !v)}
          >
            <span>Teacher — All Responses</span>
            <span className="intake-reviewed-chevron">{showTeacherDetail ? '▲' : '▼'}</span>
          </button>
          {showTeacherDetail && (
            <ResponseDetail
              sections={TEACHER_SECTIONS}
              responses={teacherForm.responses}
              label="Teacher"
            />
          )}
        </div>
      )}

      <p className="vand-disclaimer">
        Vanderbilt scores are screening tools and must be interpreted within the context of a full clinical evaluation.
      </p>
    </div>
  )
}

import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore'
import { db } from '../../firebase'
import {
  PARENT_SECTIONS,
  SYMPTOM_OPTIONS,
  PERFORMANCE_OPTIONS,
  scoreParent,
} from '../../data/vanderbilt'
import ClinicIdentityBanner from '../intake/ClinicIdentityBanner'

function warn(err) { console.warn('[VanderbiltParent]', err?.code ?? err?.message ?? err) }

// ── Question row component ──
function QuestionRow({ num, text, type, value, onChange }) {
  const options = type === 'performance' ? PERFORMANCE_OPTIONS : SYMPTOM_OPTIONS
  const flagged = type === 'symptom' && value >= 2
  return (
    <div className={`vand-question${flagged ? ' vand-question--flagged' : ''}`}>
      <p className="vand-question__text">
        <span className="vand-question__num">{num}.</span> {text}
      </p>
      <div className="vand-chips" role="group" aria-label={`Question ${num}`}>
        {options.map((opt) => (
          <button
            key={opt.value}
            type="button"
            className={`scale-chip${value === opt.value ? ' scale-chip--selected' : ''}`}
            onClick={() => onChange(opt.value)}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  )
}

export default function VanderbiltParentForm() {
  const { id } = useParams()

  const [formData,  setFormData]  = useState(null)
  const [profile,   setProfile]   = useState(null)
  const [loading,   setLoading]   = useState(true)
  const [error,     setError]     = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [responses, setResponses] = useState({}) // { q1: null, q2: null, ... }
  const [comments,  setComments]  = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')
  const [showValidation, setShowValidation] = useState(false)

  // Build total question count
  const totalSymptomQ  = 47 // Q1-47
  const totalPerfQ     = 8  // Q48-55
  const totalQuestions = totalSymptomQ + totalPerfQ // 55

  useEffect(() => {
    async function load() {
      try {
        const snap = await getDoc(doc(db, 'vanderbiltParentForms', id))
        if (!snap.exists()) {
          setError('This link is not valid or has expired.')
          setLoading(false)
          return
        }
        const data = snap.data()
        if (data.status === 'completed') {
          setSubmitted(true)
          setLoading(false)
          return
        }
        setFormData(data)

        // Load clinician profile for banner
        if (data.clinicianId) {
          getDoc(doc(db, 'clinicianProfiles', data.clinicianId))
            .then((ps) => { if (ps.exists()) setProfile(ps.data()) })
            .catch(warn)
        }
      } catch (err) {
        console.error(err)
        setError('Failed to load form. Please try again or contact the clinic.')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [id])

  function setResponse(qNum, value) {
    setResponses((prev) => ({ ...prev, [`q${qNum}`]: value }))
  }

  function countAnswered() {
    let n = 0
    for (let i = 1; i <= totalQuestions; i++) {
      if (responses[`q${i}`] !== undefined && responses[`q${i}`] !== null) n++
    }
    return n
  }

  const answered      = countAnswered()
  const allAnswered   = answered === totalQuestions
  const progressPct   = Math.round((answered / totalQuestions) * 100)

  async function handleSubmit(e) {
    e.preventDefault()
    if (!allAnswered) {
      setShowValidation(true)
      // Scroll to first unanswered
      const first = document.querySelector('.vand-question--unanswered')
      if (first) first.scrollIntoView({ behavior: 'smooth', block: 'center' })
      return
    }
    setSubmitting(true)
    setSubmitError('')
    try {
      const scores = scoreParent(responses)
      await updateDoc(doc(db, 'vanderbiltParentForms', id), {
        status: 'completed',
        responses,
        scores,
        comments: comments.trim(),
        submittedAt: serverTimestamp(),
      })
      // Best-effort update main assessment doc
      if (formData?.assessmentId) {
        updateDoc(doc(db, 'vanderbiltAssessments', formData.assessmentId), {
          parentStatus: 'completed',
          parentResponses: responses,
          parentScores: scores,
          parentComments: comments.trim(),
          parentSubmittedAt: serverTimestamp(),
        }).catch(warn)
      }
      setSubmitted(true)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } catch (err) {
      console.error(err)
      setSubmitError('Submission failed. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  // ── Render states ──

  if (loading) {
    return (
      <div className="intake-page">
        <div className="intake-card">
          <p className="intake-loading">Loading form…</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="intake-page">
        <div className="intake-card">
          <p className="intake-error-msg">{error}</p>
        </div>
      </div>
    )
  }

  if (submitted) {
    return (
      <div className="intake-page">
        <div className="intake-card">
          <ClinicIdentityBanner profile={profile} />
          <div className="intake-done-card">
            <h2 className="intake-done-title">Thank you!</h2>
            <p className="intake-done-body">
              Your responses for <strong>{formData?.childName || 'this child'}</strong> have been submitted successfully.
              The clinician will review your answers before the appointment.
            </p>
            <p className="intake-done-body" style={{ marginTop: '0.5rem', fontSize: '0.9rem', color: 'var(--muted)' }}>
              You may now close this window.
            </p>
          </div>
        </div>
      </div>
    )
  }

  // ── Question offset by section ──
  let qOffset = 0

  return (
    <div className="intake-page vand-form-page">
      <div className="intake-card vand-form-card">
        <ClinicIdentityBanner profile={profile} />

        <div className="vand-form-header">
          <h1 className="vand-form-title">Vanderbilt ADHD Parent Rating Scale</h1>
          <p className="vand-form-sub">
            Completing for: <strong>{formData?.childName}</strong> · Grade {formData?.gradeLevel}
          </p>
          {formData?.onMedication && (
            <p className="vand-form-note">Please rate your child's behavior <em>on</em> their current medication.</p>
          )}
        </div>

        <div className="scale-progress-bar">
          <div className="scale-progress-fill" style={{ width: `${progressPct}%` }} />
        </div>
        <p className="vand-progress-label">{answered} of {totalQuestions} answered</p>

        <p className="vand-instructions">
          Each question asks about behaviors your child may have shown over the past 6 months. Rate how often each behavior occurs.
        </p>

        <form onSubmit={handleSubmit} noValidate>
          {PARENT_SECTIONS.map((section) => {
            const qStart = qOffset + 1
            const sectionItems = section.questions.map((text, i) => {
              const qNum = qOffset + i + 1
              const val  = responses[`q${qNum}`] ?? null
              const isUnanswered = showValidation && val === null
              return (
                <div
                  key={qNum}
                  className={isUnanswered ? 'vand-question--unanswered' : ''}
                >
                  <QuestionRow
                    num={qNum}
                    text={text}
                    type={section.type}
                    value={val}
                    onChange={(v) => setResponse(qNum, v)}
                  />
                </div>
              )
            })
            qOffset += section.questions.length

            return (
              <div key={section.id} className="vand-section">
                <div className="vand-section-header">
                  <h2 className="vand-section-title">{section.title}</h2>
                  <span className="vand-section-range">Questions {qStart}–{qOffset}</span>
                </div>
                {section.hint && <p className="vand-section-hint">{section.hint}</p>}
                {section.type === 'symptom' && (
                  <div className="vand-options-legend">
                    {SYMPTOM_OPTIONS.map((o) => <span key={o.value}>{o.label}</span>)}
                  </div>
                )}
                {sectionItems}
              </div>
            )
          })}

          {/* Comments */}
          <div className="vand-section">
            <label className="intake-label" htmlFor="vp-comments">
              Additional comments (optional)
            </label>
            <textarea
              id="vp-comments"
              className="intake-input vand-comments"
              rows={4}
              value={comments}
              onChange={(e) => setComments(e.target.value)}
              placeholder="Any other observations, concerns, or context you'd like the clinician to know…"
            />
          </div>

          {showValidation && !allAnswered && (
            <p className="vand-validation-msg">
              Please answer all {totalQuestions - answered} remaining question{totalQuestions - answered !== 1 ? 's' : ''} before submitting.
            </p>
          )}

          {submitError && <p className="vand-validation-msg">{submitError}</p>}

          <button
            type="submit"
            className="intake-primary-btn vand-submit-btn"
            disabled={submitting}
          >
            {submitting ? 'Submitting…' : `Submit Form (${answered}/${totalQuestions} answered)`}
          </button>

          <p className="vand-submit-note">
            Your responses are securely transmitted directly to {formData?.childName ? `${formData.childName}'s` : 'the'} clinician.
          </p>
        </form>
      </div>
    </div>
  )
}

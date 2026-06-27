import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  collection,
  doc,
  addDoc,
  setDoc,
  updateDoc,
  getDocs,
  deleteDoc,
  query,
  where,
  serverTimestamp,
} from 'firebase/firestore'
import { db } from '../../firebase'
import { generateToken } from '../../data/vanderbilt'

const TIMEOUT_MS = 12_000

function withTimeout(promise) {
  return Promise.race([
    promise,
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error('TIMEOUT')), TIMEOUT_MS)
    ),
  ])
}

function warn(err) { console.warn('[Vanderbilt]', err?.code ?? err?.message ?? err) }

// ── Grade options ──
const GRADE_OPTIONS = [
  'Pre-K', 'Kindergarten',
  '1st', '2nd', '3rd', '4th', '5th', '6th',
  '7th', '8th', '9th', '10th', '11th', '12th',
]

// ─────────────────────────────────────────────
// GeneratePanel — child info + parent + teacher sections
// ─────────────────────────────────────────────
function GeneratePanel({ user }) {
  const navigate = useNavigate()

  // Child info
  const [childName,    setChildName]    = useState('')
  const [childDOB,     setChildDOB]     = useState('')
  const [gradeLevel,   setGradeLevel]   = useState('')
  const [onMedication, setOnMedication] = useState(null) // true | false | null

  // Parent section
  const [parentName,  setParentName]  = useState('')
  const [parentEmail, setParentEmail] = useState('')
  const [parentPhone, setParentPhone] = useState('')
  const [parentLink,  setParentLink]  = useState('')
  const [parentLoading, setParentLoading] = useState(false)
  const [parentError,   setParentError]   = useState('')
  const [parentCopied,  setParentCopied]  = useState(false)

  // Teacher section
  const [teacherName,  setTeacherName]  = useState('')
  const [teacherClass, setTeacherClass] = useState('')
  const [teacherEmail, setTeacherEmail] = useState('')
  const [teacherPhone, setTeacherPhone] = useState('')
  const [teacherLink,  setTeacherLink]  = useState('')
  const [teacherLoading, setTeacherLoading] = useState(false)
  const [teacherError,   setTeacherError]   = useState('')
  const [teacherCopied,  setTeacherCopied]  = useState(false)

  // Shared — assessmentId set when first link is generated
  const [assessmentId, setAssessmentId] = useState('')

  function childInfoValid() {
    return childName.trim() && childDOB && gradeLevel && onMedication !== null
  }

  async function handleGenerateParent(e) {
    e.preventDefault()
    setParentError('')
    if (!childInfoValid()) { setParentError('Please complete all child information fields first.'); return }
    if (!parentName.trim()) { setParentError('Parent/guardian name is required.'); return }

    setParentLoading(true)
    try {
      const plId = generateToken('vp')
      let aId = assessmentId

      if (!aId) {
        const ref = await withTimeout(addDoc(collection(db, 'vanderbiltAssessments'), {
          clinicianId: user.uid,
          childName:   childName.trim(),
          childDOB,
          gradeLevel,
          onMedication,
          parentName:  parentName.trim(),
          parentEmail: parentEmail.trim(),
          parentPhone: parentPhone.trim(),
          parentLinkId: plId,
          parentStatus: 'pending',
          reviewed: false,
          createdAt: serverTimestamp(),
        }))
        aId = ref.id
        setAssessmentId(aId)
      } else {
        await withTimeout(updateDoc(doc(db, 'vanderbiltAssessments', aId), {
          parentName:  parentName.trim(),
          parentEmail: parentEmail.trim(),
          parentPhone: parentPhone.trim(),
          parentLinkId: plId,
          parentStatus: 'pending',
        }))
      }

      await withTimeout(setDoc(doc(db, 'vanderbiltParentForms', plId), {
        assessmentId: aId,
        clinicianId:  user.uid,
        childName:    childName.trim(),
        childDOB,
        gradeLevel,
        onMedication,
        parentName:   parentName.trim(),
        status: 'pending',
        createdAt: serverTimestamp(),
      }))

      setParentLink(`${window.location.origin}/vanderbilt/parent/${plId}`)
    } catch (err) {
      if (err.message === 'TIMEOUT') setParentError('Request timed out. Check your connection.')
      else if (err.code === 'permission-denied') setParentError('Permission denied. Please sign in and try again.')
      else setParentError('Failed to generate link. Please try again.')
      console.error(err)
    } finally {
      setParentLoading(false)
    }
  }

  async function handleGenerateTeacher(e) {
    e.preventDefault()
    setTeacherError('')
    if (!childInfoValid()) { setTeacherError('Please complete all child information fields first.'); return }
    if (!teacherName.trim()) { setTeacherError('Teacher name is required.'); return }

    setTeacherLoading(true)
    try {
      const tlId = generateToken('vt')
      let aId = assessmentId

      if (!aId) {
        const ref = await withTimeout(addDoc(collection(db, 'vanderbiltAssessments'), {
          clinicianId: user.uid,
          childName:   childName.trim(),
          childDOB,
          gradeLevel,
          onMedication,
          teacherName:  teacherName.trim(),
          teacherClass: teacherClass.trim(),
          teacherEmail: teacherEmail.trim(),
          teacherPhone: teacherPhone.trim(),
          teacherLinkId: tlId,
          teacherStatus: 'pending',
          reviewed: false,
          createdAt: serverTimestamp(),
        }))
        aId = ref.id
        setAssessmentId(aId)
      } else {
        await withTimeout(updateDoc(doc(db, 'vanderbiltAssessments', aId), {
          teacherName:  teacherName.trim(),
          teacherClass: teacherClass.trim(),
          teacherEmail: teacherEmail.trim(),
          teacherPhone: teacherPhone.trim(),
          teacherLinkId: tlId,
          teacherStatus: 'pending',
        }))
      }

      await withTimeout(setDoc(doc(db, 'vanderbiltTeacherForms', tlId), {
        assessmentId: aId,
        clinicianId:  user.uid,
        childName:    childName.trim(),
        childDOB,
        gradeLevel,
        onMedication,
        teacherName:  teacherName.trim(),
        teacherClass: teacherClass.trim(),
        status: 'pending',
        createdAt: serverTimestamp(),
      }))

      setTeacherLink(`${window.location.origin}/vanderbilt/teacher/${tlId}`)
    } catch (err) {
      if (err.message === 'TIMEOUT') setTeacherError('Request timed out. Check your connection.')
      else if (err.code === 'permission-denied') setTeacherError('Permission denied. Please sign in and try again.')
      else setTeacherError('Failed to generate link. Please try again.')
      console.error(err)
    } finally {
      setTeacherLoading(false)
    }
  }

  function copyLink(link, setCopied) {
    navigator.clipboard.writeText(link).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  function buildEmailBody(type, link, name) {
    const greeting = `Hi ${name || 'there'},`
    const intro = type === 'parent'
      ? `Your child's clinician has requested that you complete a brief rating form to help with their evaluation.`
      : `A patient's clinician has requested that you complete a brief teacher rating form to help with their evaluation.`
    return encodeURIComponent(
      `${greeting}\n\n${intro}\n\nPlease click the link below to complete the form:\n${link}\n\nThis link is secure and only for your use. If you have any questions, please contact our office.\n\nThank you.`
    )
  }

  function resetForm() {
    setChildName(''); setChildDOB(''); setGradeLevel(''); setOnMedication(null)
    setParentName(''); setParentEmail(''); setParentPhone(''); setParentLink(''); setParentError('')
    setTeacherName(''); setTeacherClass(''); setTeacherEmail(''); setTeacherPhone(''); setTeacherLink(''); setTeacherError('')
    setAssessmentId('')
  }

  return (
    <section className="vand-generate-panel">
      <div className="vand-panel-header">
        <h2 className="vand-panel-title">Send Vanderbilt Forms</h2>
        <p className="vand-panel-sub">Generate separate links for parent and teacher. Each can be sent independently.</p>
      </div>

      {/* ── Child Information ── */}
      <div className="vand-child-info">
        <h3 className="vand-section-label">Child Information</h3>
        <div className="vand-field-row">
          <div className="vand-field">
            <label className="intake-label" htmlFor="v-childName">Child's name</label>
            <input id="v-childName" className="intake-input" value={childName} onChange={(e) => setChildName(e.target.value)} placeholder="Full name" />
          </div>
          <div className="vand-field">
            <label className="intake-label" htmlFor="v-childDOB">Date of birth</label>
            <input id="v-childDOB" type="date" className="intake-input" value={childDOB} onChange={(e) => setChildDOB(e.target.value)} />
          </div>
        </div>
        <div className="vand-field-row">
          <div className="vand-field">
            <label className="intake-label" htmlFor="v-grade">Grade / Year</label>
            <select id="v-grade" className="intake-input" value={gradeLevel} onChange={(e) => setGradeLevel(e.target.value)}>
              <option value="">Select grade</option>
              {GRADE_OPTIONS.map((g) => <option key={g} value={g}>{g}</option>)}
            </select>
          </div>
          <div className="vand-field">
            <label className="intake-label">Currently on ADHD medication?</label>
            <div className="vand-yesno">
              {[true, false].map((val) => (
                <button
                  key={String(val)}
                  type="button"
                  className={`intake-chip${onMedication === val ? ' intake-chip--selected' : ''}`}
                  onClick={() => setOnMedication(val)}
                >
                  {val ? 'Yes' : 'No'}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="vand-forms-row">
        {/* ── Parent Section ── */}
        <div className="vand-form-section">
          <h3 className="vand-form-section-title">Parent / Guardian Form</h3>
          {!parentLink ? (
            <form onSubmit={handleGenerateParent} noValidate>
              <div className="vand-field">
                <label className="intake-label" htmlFor="v-parentName">Parent / guardian name</label>
                <input id="v-parentName" className="intake-input" value={parentName} onChange={(e) => setParentName(e.target.value)} placeholder="Full name" />
              </div>
              <div className="vand-field">
                <label className="intake-label" htmlFor="v-parentEmail">Email (optional)</label>
                <input id="v-parentEmail" type="email" className="intake-input" value={parentEmail} onChange={(e) => setParentEmail(e.target.value)} placeholder="parent@example.com" />
              </div>
              <div className="vand-field">
                <label className="intake-label" htmlFor="v-parentPhone">Phone (optional)</label>
                <input id="v-parentPhone" type="tel" className="intake-input" value={parentPhone} onChange={(e) => setParentPhone(e.target.value)} placeholder="(555) 000-0000" />
              </div>
              {parentError && <p className="vand-field-error">{parentError}</p>}
              <button type="submit" className="intake-primary-btn" disabled={parentLoading}>
                {parentLoading ? 'Generating…' : 'Generate Parent Link'}
              </button>
            </form>
          ) : (
            <div className="vand-link-display">
              <p className="vand-link-label">Parent link ready</p>
              <div className="vand-link-box">
                <input readOnly className="intake-input vand-link-input" value={parentLink} onFocus={(e) => e.target.select()} />
              </div>
              <div className="vand-link-actions">
                <button
                  type="button"
                  className="intake-primary-btn"
                  onClick={() => copyLink(parentLink, setParentCopied)}
                >
                  {parentCopied ? 'Copied!' : 'Copy Link'}
                </button>
                {parentEmail && (
                  <a
                    className="vand-email-btn"
                    href={`mailto:${parentEmail}?subject=ADHD Rating Form — Action Required&body=${buildEmailBody('parent', parentLink, parentName)}`}
                  >
                    Open Email Draft
                  </a>
                )}
                {parentPhone && (
                  <a
                    className="vand-sms-btn"
                    href={`sms:${parentPhone}?body=${encodeURIComponent(`Hi ${parentName || 'there'}, please complete this ADHD rating form: ${parentLink}`)}`}
                  >
                    Open SMS
                  </a>
                )}
              </div>
              <p className="vand-link-note">Send this link directly to the parent or guardian. Do not share it publicly.</p>
              <button
                type="button"
                className="vand-new-link-btn"
                onClick={() => { setParentLink(''); setParentName(''); setParentEmail(''); setParentPhone(''); }}
              >
                + New parent link
              </button>
            </div>
          )}
        </div>

        {/* ── Teacher Section ── */}
        <div className="vand-form-section">
          <h3 className="vand-form-section-title">Teacher / School Form</h3>
          {!teacherLink ? (
            <form onSubmit={handleGenerateTeacher} noValidate>
              <div className="vand-field">
                <label className="intake-label" htmlFor="v-teacherName">Teacher name</label>
                <input id="v-teacherName" className="intake-input" value={teacherName} onChange={(e) => setTeacherName(e.target.value)} placeholder="Full name" />
              </div>
              <div className="vand-field">
                <label className="intake-label" htmlFor="v-teacherClass">Class / subject</label>
                <input id="v-teacherClass" className="intake-input" value={teacherClass} onChange={(e) => setTeacherClass(e.target.value)} placeholder="e.g. 4th Grade, Homeroom" />
              </div>
              <div className="vand-field">
                <label className="intake-label" htmlFor="v-teacherEmail">Email (optional)</label>
                <input id="v-teacherEmail" type="email" className="intake-input" value={teacherEmail} onChange={(e) => setTeacherEmail(e.target.value)} placeholder="teacher@school.edu" />
              </div>
              <div className="vand-field">
                <label className="intake-label" htmlFor="v-teacherPhone">Phone (optional)</label>
                <input id="v-teacherPhone" type="tel" className="intake-input" value={teacherPhone} onChange={(e) => setTeacherPhone(e.target.value)} placeholder="(555) 000-0000" />
              </div>
              {teacherError && <p className="vand-field-error">{teacherError}</p>}
              <button type="submit" className="intake-primary-btn" disabled={teacherLoading}>
                {teacherLoading ? 'Generating…' : 'Generate Teacher Link'}
              </button>
            </form>
          ) : (
            <div className="vand-link-display">
              <p className="vand-link-label">Teacher link ready</p>
              <div className="vand-link-box">
                <input readOnly className="intake-input vand-link-input" value={teacherLink} onFocus={(e) => e.target.select()} />
              </div>
              <div className="vand-link-actions">
                <button
                  type="button"
                  className="intake-primary-btn"
                  onClick={() => copyLink(teacherLink, setTeacherCopied)}
                >
                  {teacherCopied ? 'Copied!' : 'Copy Link'}
                </button>
                {teacherEmail && (
                  <a
                    className="vand-email-btn"
                    href={`mailto:${teacherEmail}?subject=ADHD Teacher Rating Form — Action Required&body=${buildEmailBody('teacher', teacherLink, teacherName)}`}
                  >
                    Open Email Draft
                  </a>
                )}
                {teacherPhone && (
                  <a
                    className="vand-sms-btn"
                    href={`sms:${teacherPhone}?body=${encodeURIComponent(`Hi ${teacherName || 'there'}, please complete this ADHD rating form: ${teacherLink}`)}`}
                  >
                    Open SMS
                  </a>
                )}
              </div>
              <p className="vand-link-note">Send this link directly to the teacher. Do not share it publicly.</p>
              <button
                type="button"
                className="vand-new-link-btn"
                onClick={() => { setTeacherLink(''); setTeacherName(''); setTeacherClass(''); setTeacherEmail(''); setTeacherPhone(''); }}
              >
                + New teacher link
              </button>
            </div>
          )}
        </div>
      </div>

      {/* View results / reset */}
      {assessmentId && (
        <div className="vand-panel-footer">
          <button
            type="button"
            className="intake-primary-btn"
            onClick={() => navigate(`/workspace/vanderbilt/${assessmentId}/results`)}
          >
            View Results
          </button>
          <button type="button" className="vand-new-link-btn" onClick={resetForm}>
            Start new assessment
          </button>
        </div>
      )}
    </section>
  )
}

// ─────────────────────────────────────────────
// AssessmentDashboard — list of past assessments
// ─────────────────────────────────────────────
function AssessmentDashboard({ user }) {
  const navigate = useNavigate()
  const [assessments, setAssessments] = useState(null) // null = loading
  const [error, setError] = useState('')
  const [deletingId, setDeletingId] = useState(null)

  useEffect(() => {
    if (!user?.uid) return
    async function load() {
      try {
        const q = query(
          collection(db, 'vanderbiltAssessments'),
          where('clinicianId', '==', user.uid)
        )
        const snap = await getDocs(q)
        const docs = snap.docs.map((d) => ({ id: d.id, ...d.data() }))
        // Sort newest-first client-side to avoid requiring a composite Firestore index
        docs.sort((a, b) => {
          const ta = a.createdAt?.seconds ?? 0
          const tb = b.createdAt?.seconds ?? 0
          return tb - ta
        })
        setAssessments(docs)
      } catch (err) {
        console.error(err)
        setError('Failed to load assessments.')
      }
    }
    load()
  }, [user?.uid])

  async function handleDelete(assessment) {
    if (!window.confirm(`Delete assessment for ${assessment.childName}? This cannot be undone.`)) return
    setDeletingId(assessment.id)
    try {
      await deleteDoc(doc(db, 'vanderbiltAssessments', assessment.id))
      // Best-effort cleanup of form docs
      if (assessment.parentLinkId) deleteDoc(doc(db, 'vanderbiltParentForms', assessment.parentLinkId)).catch(warn)
      if (assessment.teacherLinkId) deleteDoc(doc(db, 'vanderbiltTeacherForms', assessment.teacherLinkId)).catch(warn)
      setAssessments((prev) => prev.filter((a) => a.id !== assessment.id))
    } catch (err) {
      console.error(err)
      alert('Delete failed. Please try again.')
    } finally {
      setDeletingId(null)
    }
  }

  function formatDate(ts) {
    if (!ts) return '—'
    const d = ts.toDate ? ts.toDate() : new Date(ts.seconds * 1000)
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  }

  function statusBadge(status) {
    if (!status) return null
    const pending   = status === 'pending'
    return (
      <span className={`vand-status-badge${pending ? ' vand-status-badge--pending' : ' vand-status-badge--done'}`}>
        {pending ? 'Pending' : 'Completed'}
      </span>
    )
  }

  if (assessments === null) return <p className="vand-loading">Loading assessments…</p>
  if (error) return <p className="vand-error">{error}</p>
  if (!assessments.length) {
    return (
      <p className="vand-empty">No Vanderbilt assessments yet. Generate a link above to get started.</p>
    )
  }

  return (
    <div className="vand-dashboard">
      <h2 className="vand-dashboard-title">Assessment Tracker</h2>
      <div className="vand-assessment-list">
        {assessments.map((a) => {
          const bothDone = a.parentStatus === 'completed' && a.teacherStatus === 'completed'
          const oneDone  = a.parentStatus === 'completed' || a.teacherStatus === 'completed'
          return (
            <article key={a.id} className={`vand-assessment-card${bothDone ? ' vand-assessment-card--complete' : ''}`}>
              <div className="vand-assessment-card__header">
                <div>
                  <h3 className="vand-assessment-card__name">{a.childName}</h3>
                  <p className="vand-assessment-card__meta">
                    Grade {a.gradeLevel} · Sent {formatDate(a.createdAt)}
                    {a.onMedication && <> · On medication</>}
                  </p>
                </div>
                {bothDone ? (
                  <span className="vand-status-badge vand-status-badge--done">Both Complete</span>
                ) : oneDone ? (
                  <span className="vand-status-badge vand-status-badge--partial">Partial</span>
                ) : (
                  <span className="vand-status-badge vand-status-badge--pending">Awaiting</span>
                )}
              </div>
              <div className="vand-assessment-card__respondents">
                {a.parentLinkId && (
                  <div className="vand-respondent">
                    <span className="vand-respondent__label">Parent</span>
                    <span className="vand-respondent__name">{a.parentName || '—'}</span>
                    {statusBadge(a.parentStatus)}
                  </div>
                )}
                {a.teacherLinkId && (
                  <div className="vand-respondent">
                    <span className="vand-respondent__label">Teacher</span>
                    <span className="vand-respondent__name">{a.teacherName || '—'}{a.teacherClass ? ` · ${a.teacherClass}` : ''}</span>
                    {statusBadge(a.teacherStatus)}
                  </div>
                )}
              </div>
              <div className="vand-assessment-card__actions">
                <button
                  type="button"
                  className="intake-primary-btn"
                  onClick={() => navigate(`/workspace/vanderbilt/${a.id}/results`)}
                >
                  View Results
                </button>
                <button
                  type="button"
                  className="vand-delete-btn"
                  disabled={deletingId === a.id}
                  onClick={() => handleDelete(a)}
                >
                  {deletingId === a.id ? 'Deleting…' : 'Delete'}
                </button>
              </div>
            </article>
          )
        })}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────
// VanderbiltPage — main page
// ─────────────────────────────────────────────
export default function VanderbiltPage({ user }) {
  return (
    <div className="vand-page">
      <div className="vand-page-header">
        <h1 className="vand-page-title">Vanderbilt ADHD Rating Scale</h1>
        <p className="vand-page-sub">
          Send VADPRS and VADTRS forms to parents and teachers. Scores and flags appear here when submitted.
        </p>
      </div>
      <AssessmentDashboard user={user} />
      <hr className="vand-divider" />
      <GeneratePanel user={user} />
    </div>
  )
}

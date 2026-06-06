import { useEffect, useState } from 'react'
import { Link, NavLink, Route, Routes } from 'react-router-dom'
import { onAuthStateChanged, signOut } from 'firebase/auth'
import { auth } from './firebase'
import Login from './components/Login'
import AssessmentWorkspace from './components/assessments/AssessmentWorkspace'
import AssessmentCard from './components/assessments/AssessmentCard'
import './App.css'

// ── Hero preview cards — real product data, no fake patient content ──
const HERO_CARDS = [
  {
    id: "phq9-preview",
    name: "PHQ-9",
    fullName: "Patient Health Questionnaire-9",
    description: "Depression severity screening",
    status: "active",
    isSafety: false,
    hasTeacherForm: false,
  },
  {
    id: "vanderbilt-preview",
    name: "Vanderbilt",
    fullName: "Vanderbilt ADHD Rating Scale",
    description: "Send to teacher in 60 seconds",
    status: "coming-soon",
    isSafety: false,
    hasTeacherForm: true,
  },
  {
    id: "cssrs-preview",
    name: "C-SSRS",
    fullName: "Columbia Suicide Severity Rating Scale",
    description: "Suicide risk — safety instrument",
    status: "coming-soon",
    isSafety: true,
    hasTeacherForm: false,
  },
]

const features = [
  {
    title: 'Send scales instantly',
    description: 'Send PHQ-9 to a patient, Vanderbilt to a teacher, or CRAFFT to a parent — directly from PsychMetric. No paper. No fax. No follow-up calls.',
  },
  {
    title: 'Scores before the visit',
    description: 'Patient completes PHQ-9 or GAD-7 in the waiting room. Score and severity appear on your dashboard before they enter the room.',
  },
  {
    title: 'Spravato and ketamine tracking',
    description: 'Track dissociation, mood, and vitals at every Spravato and ketamine session. Built with REMS documentation in mind.',
  },
  {
    title: 'Clinician review always',
    description: 'Every score is a starting point, not a conclusion. PsychMetric surfaces the data. You make the clinical decision.',
  },
]

const metrics = [
  { value: '8+', label: 'psychiatry note sections' },
  { value: '12', label: 'planned psychometric tools' },
  { value: '< 2 min', label: 'target draft turnaround' },
]

function UserAvatar({ email }) {
  const initial = email ? email[0].toUpperCase() : '?'
  return (
    <span className="user-avatar" aria-label={`Signed in as ${email}`}>
      {initial}
    </span>
  )
}

function Header({ user }) {
  return (
    <header className="site-header">
      <Link className="brand" to="/" aria-label="PsychMetric home">
        <span className="logo-wrap">
          <img src="/logo.png" alt="PsychMetric" className="brand-logo" />
        </span>
      </Link>
      <nav className="nav-links" aria-label="Primary navigation">
        <NavLink to="/" end>Home</NavLink>
        <NavLink to="/psychometrics">Psychometric Tools</NavLink>
        <NavLink to="/templates">Notes &amp; Templates</NavLink>
      </nav>
      <div className="header-user">
        {user?.email && (
          <>
            <span className="user-email">{user.email}</span>
            <UserAvatar email={user.email} />
          </>
        )}
        <button className="nav-cta signout-btn" onClick={() => signOut(auth)} type="button">Sign out</button>
      </div>
    </header>
  )
}

function HeroPreview() {
  const [toast, setToast] = useState(null)

  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(null), 2500)
    return () => clearTimeout(t)
  }, [toast])

  return (
    <div className="hero-preview">
      {toast && (
        <div className="workspace-toast" role="status" aria-live="polite">
          {toast} — this feature is coming soon.
        </div>
      )}
      <p className="hero-preview__label">Clinical Assessment Workspace — Preview</p>
      <div className="hero-preview__cards">
        {/* PHQ-9: Complete in Office only */}
        <AssessmentCard
          assessment={HERO_CARDS[0]}
          hideSendToPatient={true}
          onToast={setToast}
        />
        {/* Vanderbilt: Send to Teacher/Parent only */}
        <AssessmentCard
          assessment={HERO_CARDS[1]}
          hideSendToPatient={true}
          hideCompleteInOffice={true}
          onToast={setToast}
        />
        {/* C-SSRS: Complete in Office only, safety styling */}
        <AssessmentCard
          assessment={HERO_CARDS[2]}
          hideSendToPatient={true}
          onToast={setToast}
        />
      </div>
    </div>
  )
}

function IScribeBanner() {
  return (
    <section className="iscribe-banner" aria-label="iScribe AI Documentation">
      <div className="iscribe-banner__inner">
        <div className="iscribe-banner__text">
          <span className="iscribe-banner__badge">Coming Next — iScribe</span>
          <h2 className="iscribe-banner__title">Notes that know your patient.</h2>
          <p className="iscribe-banner__subtitle">
            When your PHQ-9, Vanderbilt, and C-SSRS are already in PsychMetric, your note has context
            before you dictate a word. iScribe uses your assessment data to generate a structured
            psychiatric SOAP note — not a generic transcript, but a note that already knows the scores.
          </p>
        </div>
      </div>
    </section>
  )
}

function HomePage() {
  return (
    <>
      <section className="hero-section">
        <div className="hero-copy">
          <p className="eyebrow">Clinician-built. Psychiatry-focused.</p>
          <h1>Psychiatric assessments built around how psychiatrists actually work.</h1>
          <ul className="hero-proof-list">
            <li><span className="hero-proof-arrow">→</span> Send the Vanderbilt to a teacher in 60 seconds</li>
            <li><span className="hero-proof-arrow">→</span> PHQ-9 scored before the patient enters the room</li>
            <li><span className="hero-proof-arrow">→</span> Spravato sessions tracked for REMS compliance</li>
          </ul>
          <p className="hero-descriptor">Psychometric assessments for modern mental health care.</p>
          <div className="hero-actions">
            <Link className="primary-button" to="/templates">Explore templates</Link>
            <Link className="secondary-button" to="/psychometrics">View psychometrics</Link>
          </div>
          <p className="compliance-note">
            Built with HIPAA-ready design priorities. Formal compliance depends on deployment, policies, agreements, and operational controls.
          </p>
        </div>
        <HeroPreview />
      </section>
      <section className="metrics-band" aria-label="Product snapshot">
        {metrics.map((metric) => (
          <div className="metric-item" key={metric.label}>
            <strong>{metric.value}</strong>
            <span>{metric.label}</span>
          </div>
        ))}
      </section>
      <section className="features-section" id="features">
        <div className="section-heading">
          <p className="eyebrow">Core workflow</p>
          <h2>Built for psychiatric workflows.</h2>
          <p>
            The first version focuses on assessment delivery, scoring, and clinician-controlled
            review — built by a clinician who uses these tools daily.
          </p>
        </div>
        <div className="feature-grid">
          {features.map((feature) => (
            <article className="feature-card" key={feature.title}>
              <span className="feature-icon" aria-hidden="true" />
              <h3>{feature.title}</h3>
              <p>{feature.description}</p>
            </article>
          ))}
        </div>
      </section>
      <IScribeBanner />
    </>
  )
}

function PsychometricToolsPage() {
  return (
    <section className="placeholder-page">
      <div className="placeholder-copy">
        <p className="eyebrow">Psychometric tools</p>
        <h1>Measurement-based care workspace.</h1>
        <p>Administer validated scales, review scores, and track symptom trajectories across visits.</p>
      </div>
      <AssessmentWorkspace />
    </section>
  )
}

function TemplatesPage() {
  const items = [
    { kicker: 'Coming in Phase 5', title: 'Initial psychiatric evaluation', description: 'Chief concern, HPI, psychiatric history, substance use, MSE, formulation, assessment, and plan.' },
    { kicker: 'Coming in Phase 5', title: 'Medication management follow-up', description: 'Symptoms, adverse effects, adherence, safety review, medication changes, and follow-up plan.' },
    { kicker: 'Coming in Phase 5', title: 'Risk assessment note', description: 'Suicidal ideation, protective factors, acute risk level, mitigation steps, and safety planning.' },
  ]
  return (
    <section className="placeholder-page">
      <div className="placeholder-copy">
        <p className="eyebrow">Notes and templates</p>
        <h1>Structured psychiatry note templates.</h1>
        <p className="templates-iscribe-subtitle">
          Powered by iScribe AI — speak your note, we structure it. Coming in Phase 5.
        </p>
      </div>
      <div className="placeholder-list">
        {items.map((item) => (
          <article className="placeholder-card" key={item.title}>
            <span>{item.kicker}</span>
            <h2>{item.title}</h2>
            <p>{item.description}</p>
          </article>
        ))}
      </div>
    </section>
  )
}

function App() {
  const [user, setUser] = useState(undefined)

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => setUser(u ?? null))
    return unsubscribe
  }, [])

  if (user === undefined) {
    return (
      <div className="app-shell auth-loading" aria-label="Loading">
        <span className="logo-wrap">
          <img src="/logo.png" alt="PsychMetric" className="loading-logo" />
        </span>
      </div>
    )
  }

  if (!user) return <Login />

  return (
    <div className="app-shell">
      <Header user={user} />
      <main>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/psychometrics" element={<PsychometricToolsPage />} />
          <Route path="/templates" element={<TemplatesPage />} />
        </Routes>
      </main>
      <footer className="site-footer">
        <span>PsychMetric</span>
        <span>Clinician-built. Psychiatry-focused.</span>
      </footer>
    </div>
  )
}

export default App

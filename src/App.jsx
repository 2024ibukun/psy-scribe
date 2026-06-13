import { useEffect, useRef, useState } from 'react'
import { Link, NavLink, Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { onAuthStateChanged, signOut } from 'firebase/auth'
import { auth } from './firebase'
import Login from './components/Login'
import AssessmentWorkspace from './components/assessments/AssessmentWorkspace'
import AssessmentCard from './components/assessments/AssessmentCard'
import IntakePage from './components/intake/IntakePage'
import SmartIntakePage from './components/intake/SmartIntakePage'
import ClinicianProfilePage from './components/clinician/ClinicianProfilePage'
import StatFormPage from './components/statform/StatFormPage'
import AbsenceExcusePage from './components/statform/AbsenceExcusePage'
import ReturnToWorkPage from './components/statform/ReturnToWorkPage'
import SchoolAccommodationPage from './components/statform/SchoolAccommodationPage'
import HousingAccommodationPage from './components/statform/HousingAccommodationPage'
import './App.css'

// ── Hero preview cards ──
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

// ─────────────────────────────────────────────
// Shared chevron icon
// ─────────────────────────────────────────────
function ChevronDown() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polyline points="6 9 12 15 18 9" />
    </svg>
  )
}

// ─────────────────────────────────────────────
// NavDropdown
// items: { to, label, badge?, comingSoon? }
//   - normal items have `to` and render as NavLink
//   - comingSoon:true renders as a button; clicking calls onToast
//   - badge adds a small "Coming Soon" tag next to the label
// ─────────────────────────────────────────────
function NavDropdown({ label, items, onToast }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)
  const location = useLocation()

  // Only real-route items count for the active trigger highlight
  const isChildActive = items
    .filter((i) => i.to)
    .some((item) => location.pathname.startsWith(item.to))

  useEffect(() => {
    function handleOutside(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handleOutside)
    return () => document.removeEventListener('mousedown', handleOutside)
  }, [])

  useEffect(() => { setOpen(false) }, [location.pathname])

  return (
    <div className="nav-dropdown" ref={ref}>
      <button
        type="button"
        className={`nav-dropdown__trigger${open || isChildActive ? ' nav-dropdown__trigger--active' : ''}`}
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="true"
      >
        {label}
        <ChevronDown />
      </button>
      {open && (
        <div className="nav-dropdown__menu" role="menu">
          {items.map((item) => {
            if (item.comingSoon) {
              return (
                <button
                  key={item.label}
                  type="button"
                  className="nav-dropdown__item nav-dropdown__item--coming"
                  role="menuitem"
                  onClick={() => {
                    setOpen(false)
                    onToast?.(`${item.label} — coming soon.`)
                  }}
                >
                  {item.label}
                  {item.badge && <span className="nav-badge">{item.badge}</span>}
                </button>
              )
            }
            return (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) => 'nav-dropdown__item' + (isActive ? ' active' : '')}
                role="menuitem"
                onClick={() => setOpen(false)}
              >
                {item.label}
                {item.badge && <span className="nav-badge">{item.badge}</span>}
              </NavLink>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────
// AvatarMenu — replaces the old header-user div
// Shows initials, opens dropdown with Profile + Sign Out
// ─────────────────────────────────────────────
function AvatarMenu({ user }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)
  const location = useLocation()
  const initial = user?.email ? user.email[0].toUpperCase() : '?'

  useEffect(() => {
    function handleOutside(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handleOutside)
    return () => document.removeEventListener('mousedown', handleOutside)
  }, [])

  useEffect(() => { setOpen(false) }, [location.pathname])

  return (
    <div className="avatar-menu" ref={ref}>
      <button
        type="button"
        className={`avatar-menu__trigger${open ? ' avatar-menu__trigger--open' : ''}`}
        onClick={() => setOpen((v) => !v)}
        aria-label="Account menu"
        aria-expanded={open}
        aria-haspopup="true"
      >
        {initial}
      </button>
      {open && (
        <div className="avatar-menu__dropdown" role="menu">
          {user?.email && (
            <p className="avatar-menu__email">{user.email}</p>
          )}
          <NavLink
            to="/settings/profile"
            className={({ isActive }) => 'avatar-menu__item' + (isActive ? ' active' : '')}
            role="menuitem"
            onClick={() => setOpen(false)}
          >
            Profile
          </NavLink>
          <button
            type="button"
            className="avatar-menu__item avatar-menu__item--signout"
            role="menuitem"
            onClick={() => { setOpen(false); signOut(auth) }}
          >
            Sign out
          </button>
        </div>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────
// Header
// Top nav: logo | Home · Workspace dropdown | AvatarMenu
// ─────────────────────────────────────────────
function Header({ user }) {
  const [toast, setToast] = useState(null)

  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(null), 2500)
    return () => clearTimeout(t)
  }, [toast])

  return (
    <header className="site-header">
      {toast && (
        <div className="nav-toast" role="status" aria-live="polite">{toast}</div>
      )}
      <Link className="brand" to="/" aria-label="PsychMetric home">
        <span className="logo-wrap">
          <img src="/logo.png" alt="PsychMetric" className="brand-logo" />
        </span>
      </Link>
      <nav className="nav-links" aria-label="Primary navigation">
        <NavLink to="/" end>Home</NavLink>
        <NavDropdown
          label="Workspace"
          items={[
            { to: "/tools/intake",      label: "Smart Intake" },
            { to: "/tools/assessments", label: "Assessments" },
            { label: "Spravato",           badge: "Coming Soon", comingSoon: true },
            { to: "/documentation",     label: "Clinical Templates", badge: "Coming Soon" },
          ]}
          onToast={setToast}
        />
        <NavLink to="/statform">StatForm</NavLink>
      </nav>
      <AvatarMenu user={user} />
    </header>
  )
}

// ─────────────────────────────────────────────
// Homepage components
// ─────────────────────────────────────────────
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
        <AssessmentCard assessment={HERO_CARDS[0]} hideSendToPatient={true} onToast={setToast} />
        <AssessmentCard assessment={HERO_CARDS[1]} hideSendToPatient={true} hideCompleteInOffice={true} onToast={setToast} />
        <AssessmentCard assessment={HERO_CARDS[2]} hideSendToPatient={true} onToast={setToast} />
      </div>
    </div>
  )
}

function IScribeBanner() {
  return (
    <section className="iscribe-banner" aria-label="Scribe — coming in Phase 5">
      <div className="iscribe-banner__inner">
        <div className="iscribe-banner__text">
          <span className="iscribe-banner__badge">Coming in Phase 5</span>
          <h2 className="iscribe-banner__title">Scribe</h2>
          <p className="iscribe-banner__subtitle">
            Dictate your psychiatric note. We structure it into a complete SOAP note ready for your EMR.
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
          <h1>Measurement-based care for mental health.</h1>
          <ul className="hero-proof-list">
            <li><span className="hero-proof-arrow">→</span> Send a smart intake link before the visit</li>
            <li><span className="hero-proof-arrow">→</span> PHQ-9, GAD-7, Vanderbilt and more scored automatically</li>
            <li><span className="hero-proof-arrow">→</span> Track Spravato and ketamine sessions for REMS compliance</li>
          </ul>
          <p className="hero-descriptor">PsychMetric was built with the thought of how psychiatrists actually work.</p>
          <div className="hero-actions">
            <Link className="primary-button" to="/tools/intake">Start Smart Intake</Link>
            <Link className="secondary-button" to="/tools/assessments">Open Assessment Workspace</Link>
          </div>
          <p className="compliance-note">
            Built with HIPAA-ready design and a signed Business Associate Agreement with our cloud provider.
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
          <h2>Simple tools for psychiatric encounters.</h2>
          <p>
            The first version focuses on the foundation: assessments, templates, measures, and
            clinician-controlled review.
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

// ─────────────────────────────────────────────
// Inner pages — logic and routes untouched
// ─────────────────────────────────────────────
function AssessmentsPage() {
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

// Previously "DocumentationPage" — relabeled as Clinical Templates
// Route stays at /documentation — no backend change
function ClinicalTemplatesPage() {
  const items = [
    { kicker: 'Coming in Phase 5', title: 'Initial psychiatric evaluation', description: 'Chief concern, HPI, psychiatric history, substance use, MSE, formulation, assessment, and plan.' },
    { kicker: 'Coming in Phase 5', title: 'Medication management follow-up', description: 'Symptoms, adverse effects, adherence, safety review, medication changes, and follow-up plan.' },
    { kicker: 'Coming in Phase 5', title: 'Risk assessment note', description: 'Suicidal ideation, protective factors, acute risk level, mitigation steps, and safety planning.' },
  ]
  return (
    <section className="placeholder-page">
      <div className="placeholder-copy">
        <p className="eyebrow">Clinical Templates</p>
        <h1>Structured psychiatry note templates.</h1>
        <p className="templates-iscribe-subtitle">
          Powered by Scribe — speak your note, we structure it. Coming in Phase 5.
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

// ─────────────────────────────────────────────
// Root authenticated app
// ─────────────────────────────────────────────
function AuthenticatedApp({ user }) {
  return (
    <div className="app-shell">
      <Header user={user} />
      <main>
        <Routes>
          <Route path="/"                   element={<HomePage />} />
          <Route path="/tools/assessments"  element={<AssessmentsPage />} />
          <Route path="/tools/intake"       element={<SmartIntakePage user={user} />} />
          <Route path="/documentation"      element={<ClinicalTemplatesPage />} />
          <Route path="/settings/profile"   element={<ClinicianProfilePage user={user} />} />
          <Route path="/statform"            element={<StatFormPage />} />
          <Route path="/statform/absence-excuse"  element={<AbsenceExcusePage user={user} />} />
          <Route path="/statform/return-to-work"       element={<ReturnToWorkPage user={user} />} />
          <Route path="/statform/school-accommodation"  element={<SchoolAccommodationPage user={user} />} />
          <Route path="/statform/housing-accommodation" element={<HousingAccommodationPage user={user} />} />
          {/* Legacy redirects — preserve all old URLs */}
          <Route path="/psychometrics"      element={<Navigate to="/tools/assessments" replace />} />
          <Route path="/templates"          element={<Navigate to="/documentation" replace />} />
        </Routes>
      </main>
      <footer className="site-footer">
        <span>PsychMetric</span>
        <span>Clinician-built. Psychiatry-focused.</span>
      </footer>
    </div>
  )
}

export default function App() {
  const [user, setUser] = useState(undefined)
  const location = useLocation()

  // Auth listener — always called before any conditional return (Rules of Hooks)
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => setUser(u ?? null))
    return unsubscribe
  }, [])

  // Public intake route — no auth required, no clinician chrome
  if (location.pathname.startsWith('/intake/')) {
    return (
      <Routes>
        <Route path="/intake/:token" element={<IntakePage />} />
      </Routes>
    )
  }

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

  return <AuthenticatedApp user={user} />
}

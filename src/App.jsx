import { useEffect, useState } from 'react'
import { Link, NavLink, Route, Routes } from 'react-router-dom'
import { onAuthStateChanged, signOut } from 'firebase/auth'
import { auth } from './firebase'
import Login from './components/Login'
import './App.css'

const features = [
  { title: 'Psychiatry-aware assessments', description: 'Administer validated psychometric tools with psychiatric history, MSE, risk assessment, diagnosis, and plan sections already in mind.' },
  { title: 'Measurement-based care', description: 'Keep PHQ-9, GAD-7, PCL-5, AUDIT-C, and other common scales close to the encounter workflow.' },
  { title: 'Clinician review first', description: 'AI output is treated as a draft so the clinician remains responsible for review, edits, and final sign-off.' },
  { title: 'Privacy-minded foundation', description: 'Designed with encryption, access controls, audit trails, and HIPAA-ready workflows as product requirements.' },
]

const metrics = [
  { value: '8+', label: 'psychiatry note sections' },
  { value: '12', label: 'planned psychometric tools' },
  { value: '< 2 min', label: 'target draft turnaround' },
]

function Header({ user }) {
  return (
    <header className="site-header">
      <Link className="brand" to="/" aria-label="PsychMetric home">
        <span className="brand-mark brand-mark--gradient">PsychMetric</span>
      </Link>
      <nav className="nav-links" aria-label="Primary navigation">
        <NavLink to="/" end>Home</NavLink>
        <NavLink to="/psychometrics">Psychometric Tools</NavLink>
        <NavLink to="/templates">Notes &amp; Templates</NavLink>
      </nav>
      <div className="header-user">
        {user?.email && <span className="user-email">{user.email}</span>}
        <button className="nav-cta signout-btn" onClick={() => signOut(auth)} type="button">Sign out</button>
      </div>
    </header>
  )
}

function ProductPreview() {
  return (
    <div className="product-preview" aria-label="PsychMetric clinical assessment preview">
      <div className="preview-toolbar"><span /><span /><span /></div>
      <div className="preview-grid">
        <section className="note-panel">
          <p className="panel-label">Assessment</p>
          <h3>Follow-up psychiatry visit</h3>
          <div className="note-line wide" />
          <div className="note-line" />
          <div className="note-block">
            <strong>Mental Status Exam</strong>
            <p>Cooperative, linear thought process, mood anxious, insight fair.</p>
          </div>
          <div className="note-block muted-block">
            <strong>Plan</strong>
            <p>Review medication response, sleep hygiene, therapy goals, and safety plan.</p>
          </div>
        </section>
        <aside className="score-panel">
          <p className="panel-label">Measures</p>
          <div className="score-row"><span>PHQ-9</span><strong>11</strong></div>
          <div className="score-row"><span>GAD-7</span><strong>8</strong></div>
          <div className="risk-card"><span>Risk review</span><strong>Needs clinician check</strong></div>
        </aside>
      </div>
    </div>
  )
}

function HomePage() {
  return (
    <>
      <section className="hero-section">
        <div className="hero-copy">
          <p className="eyebrow">AI-powered clinical assessment platform</p>
          <h1>Psychometric assessments for modern mental health care.</h1>
          <p className="hero-text">
            PsychMetric helps psychiatry teams administer validated scales, track rating scores, and organize clinical assessments in one clean workspace.
          </p>
          <div className="hero-actions">
            <Link className="primary-button" to="/templates">Explore templates</Link>
            <Link className="secondary-button" to="/psychometrics">View psychometrics</Link>
          </div>
          <p className="compliance-note">
            Built with HIPAA-ready design priorities. Formal compliance depends on deployment, policies, agreements, and operational controls.
          </p>
        </div>
        <ProductPreview />
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
          <p>The first version focuses on the foundation: assessments, templates, measures, and clinician-controlled review.</p>
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
    </>
  )
}

function PlaceholderPage({ eyebrow, title, description, items }) {
  return (
    <section className="placeholder-page">
      <div className="placeholder-copy">
        <p className="eyebrow">{eyebrow}</p>
        <h1>{title}</h1>
        <p>{description}</p>
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

function PsychometricToolsPage() {
  return (
    <PlaceholderPage
      eyebrow="Psychometric tools"
      title="Measurement-based care workspace."
      description="A placeholder for rating scales, scoring, trend views, and clinician review workflows."
      items={[
        { kicker: 'Planned', title: 'Common psychiatry scales', description: 'PHQ-9, GAD-7, PCL-5, AUDIT-C, MDQ, ASRS, and other validated tools can live here.' },
        { kicker: 'Planned', title: 'Score interpretation', description: 'Surface score ranges, change over time, and prompts for clinician review without replacing clinical judgment.' },
        { kicker: 'Planned', title: 'Longitudinal tracking', description: 'Give clinicians a quick view of symptom trajectories across visits.' },
      ]}
    />
  )
}

function TemplatesPage() {
  return (
    <PlaceholderPage
      eyebrow="Notes and templates"
      title="Structured psychiatry note templates."
      description="A placeholder for intake, follow-up, medication management, therapy, and risk assessment templates."
      items={[
        { kicker: 'Draft', title: 'Initial psychiatric evaluation', description: 'Chief concern, HPI, psychiatric history, substance use, MSE, formulation, assessment, and plan.' },
        { kicker: 'Draft', title: 'Medication management follow-up', description: 'Symptoms, adverse effects, adherence, safety review, medication changes, and follow-up plan.' },
        { kicker: 'Draft', title: 'Risk assessment note', description: 'Suicidal ideation, protective factors, acute risk level, mitigation steps, and safety planning.' },
      ]}
    />
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
        <span className="brand-mark brand-mark--gradient">PsychMetric</span>
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
        <span>AI-powered psychometric assessments for psychiatry.</span>
      </footer>
    </div>
  )
}

export default App
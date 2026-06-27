import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import {
  applyActionCode,
  confirmPasswordReset,
  isSignInWithEmailLink,
  signInWithEmailLink,
  verifyPasswordResetCode,
} from 'firebase/auth'
import { auth } from '../firebase'

export default function AuthAction() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const mode    = searchParams.get('mode')
  const oobCode = searchParams.get('oobCode')

  // status: loading | email-prompt | form | success | error
  const [status,         setStatus]         = useState('loading')
  const [errorMessage,   setErrorMessage]   = useState('')
  const [successMessage, setSuccessMessage] = useState('')

  // reset-password form
  const [password,         setPassword]         = useState('')
  const [confirmPassword,  setConfirmPassword]  = useState('')
  const [fieldError,       setFieldError]       = useState('')
  const [submitting,       setSubmitting]       = useState(false)

  // email-prompt (magic link opened on a different device)
  const [emailInput, setEmailInput] = useState('')

  useEffect(() => {
    if (mode === 'signIn') {
      if (!isSignInWithEmailLink(auth, window.location.href)) {
        setErrorMessage('This link is not valid.')
        setStatus('error')
        return
      }
      const saved = window.localStorage.getItem('emailForSignIn')
      if (!saved) {
        // Opened on a different device — ask for email before completing sign-in
        setStatus('email-prompt')
        return
      }
      signInWithEmailLink(auth, saved, window.location.href)
        .then(() => {
          window.localStorage.removeItem('emailForSignIn')
          navigate('/tools/intake', { replace: true })
        })
        .catch((err) => {
          setErrorMessage(friendlyError(err.code))
          setStatus('error')
        })
      return
    }

    if (!oobCode) {
      setErrorMessage('Invalid or missing action code.')
      setStatus('error')
      return
    }

    if (mode === 'verifyEmail' || mode === 'recoverEmail') {
      applyActionCode(auth, oobCode)
        .then(() => {
          setSuccessMessage(
            mode === 'verifyEmail'
              ? 'Email verified successfully.'
              : 'Email recovered successfully.'
          )
          setStatus('success')
          setTimeout(() => navigate('/login', { replace: true }), 2000)
        })
        .catch((err) => {
          setErrorMessage(friendlyError(err.code))
          setStatus('error')
        })
    } else if (mode === 'resetPassword') {
      verifyPasswordResetCode(auth, oobCode)
        .then(() => setStatus('form'))
        .catch((err) => {
          setErrorMessage(friendlyError(err.code))
          setStatus('error')
        })
    } else {
      setErrorMessage('Unknown action type. This link may be malformed.')
      setStatus('error')
    }
  }, [mode, oobCode, navigate])

  async function handleReset(e) {
    e.preventDefault()
    setFieldError('')
    if (password !== confirmPassword) { setFieldError('Passwords do not match.'); return }
    if (password.length < 6)          { setFieldError('Password must be at least 6 characters.'); return }
    setSubmitting(true)
    try {
      await confirmPasswordReset(auth, oobCode, password)
      setSuccessMessage('Password reset successfully.')
      setStatus('success')
      setTimeout(() => navigate('/login', { replace: true }), 2000)
    } catch (err) {
      setFieldError(friendlyError(err.code))
      setSubmitting(false)
    }
  }

  async function handleEmailPrompt(e) {
    e.preventDefault()
    setFieldError('')
    const email = emailInput.trim()
    if (!email) return
    setSubmitting(true)
    try {
      await signInWithEmailLink(auth, email, window.location.href)
      window.localStorage.removeItem('emailForSignIn')
      navigate('/tools/intake', { replace: true })
    } catch (err) {
      setFieldError(friendlyError(err.code))
      setSubmitting(false)
    }
  }

  // ── Shared sub-components ─────────────────────────────────────────────────

  const Logo = () => (
    <div className="login-brand">
      <span className="logo-wrap">
        <img src="/logo.png" alt="PsychMetric" className="login-logo" />
      </span>
    </div>
  )

  const Footer = () => (
    <p className="login-footer">For authorized clinical staff only. All activity is logged.</p>
  )

  // ── Status renders ────────────────────────────────────────────────────────

  if (status === 'loading') {
    return (
      <div className="login-shell">
        <div className="login-card">
          <Logo />
          <p style={{ textAlign: 'center', color: 'var(--muted, #6b7280)', margin: '0 0 1.5rem' }}>
            Completing sign-in…
          </p>
          <Footer />
        </div>
      </div>
    )
  }

  if (status === 'error') {
    return (
      <div className="login-shell">
        <div className="login-card">
          <Logo />
          <p className="auth-message error" role="alert">{errorMessage}</p>
          <button
            type="button"
            className="primary-button full-width"
            style={{ marginTop: '1rem' }}
            onClick={() => navigate('/login', { replace: true })}
          >
            Back to sign in
          </button>
          <Footer />
        </div>
      </div>
    )
  }

  if (status === 'success') {
    return (
      <div className="login-shell">
        <div className="login-card">
          <Logo />
          <p className="auth-message info" role="status">{successMessage}</p>
          <p style={{ textAlign: 'center', fontSize: '.82rem', color: 'var(--muted, #6b7280)', marginTop: '.75rem' }}>
            Redirecting to sign in…
          </p>
          <Footer />
        </div>
      </div>
    )
  }

  if (status === 'email-prompt') {
    return (
      <div className="login-shell">
        <div className="login-card">
          <Logo />
          <h2 style={{ marginBottom: '.5rem', fontSize: '1.1rem', fontWeight: 600 }}>Confirm your email</h2>
          <p style={{ fontSize: '.9rem', color: 'var(--muted, #6b7280)', marginBottom: '1rem' }}>
            Please enter the email address you used to request this link.
          </p>
          <form className="login-form" onSubmit={handleEmailPrompt} noValidate>
            <label className="field-label" htmlFor="prompt-email">Email</label>
            <input
              id="prompt-email"
              type="email"
              className="field-input"
              value={emailInput}
              onChange={(e) => setEmailInput(e.target.value)}
              placeholder="you@example.com"
              autoComplete="email"
              autoFocus
              required
            />
            {fieldError && <p className="auth-message error" role="alert">{fieldError}</p>}
            <button type="submit" className="primary-button full-width" disabled={submitting}>
              {submitting ? 'Signing in…' : 'Continue'}
            </button>
          </form>
          <Footer />
        </div>
      </div>
    )
  }

  // status === 'form' — reset password
  return (
    <div className="login-shell">
      <div className="login-card">
        <Logo />
        <h2 style={{ marginBottom: '1rem', fontSize: '1.1rem', fontWeight: 600 }}>Set a new password</h2>
        <form className="login-form" onSubmit={handleReset} noValidate>
          <label className="field-label" htmlFor="new-password">New password</label>
          <input
            id="new-password"
            type="password"
            className="field-input"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="At least 6 characters"
            autoComplete="new-password"
            required
          />
          <label className="field-label" htmlFor="confirm-password">Confirm password</label>
          <input
            id="confirm-password"
            type="password"
            className="field-input"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Repeat new password"
            autoComplete="new-password"
            required
          />
          {fieldError && <p className="auth-message error" role="alert">{fieldError}</p>}
          <button type="submit" className="primary-button full-width" disabled={submitting}>
            {submitting ? 'Updating…' : 'Reset password'}
          </button>
        </form>
        <Footer />
      </div>
    </div>
  )
}

function friendlyError(code) {
  const map = {
    'auth/expired-action-code': 'This link has expired. Please request a new sign-in link.',
    'auth/invalid-action-code': 'This link has already been used or is invalid. Please request a new sign-in link.',
    'auth/invalid-email':       'Please enter a valid email address.',
    'auth/user-disabled':       'This account has been disabled.',
    'auth/user-not-found':      'No account found for this link.',
    'auth/weak-password':       'Password must be at least 6 characters.',
  }
  return map[code] ?? 'Something went wrong. Please request a new sign-in link.'
}

import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import {
  applyActionCode,
  confirmPasswordReset,
  verifyPasswordResetCode,
} from 'firebase/auth'
import { auth } from '../firebase'

export default function AuthAction() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const mode = searchParams.get('mode')
  const oobCode = searchParams.get('oobCode')

  const [status, setStatus] = useState('loading') // loading | form | error
  const [errorMessage, setErrorMessage] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [fieldError, setFieldError] = useState('')

  useEffect(() => {
    if (!oobCode) {
      setErrorMessage('Invalid or missing action code.')
      setStatus('error')
      return
    }

    if (mode === 'verifyEmail' || mode === 'recoverEmail') {
      applyActionCode(auth, oobCode)
        .then(() => {
          const msg = mode === 'verifyEmail'
            ? 'Email verified. You can now sign in.'
            : 'Email recovered. You can now sign in.'
          sessionStorage.setItem('authFlash', msg)
          navigate('/', { replace: true })
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
    if (password !== confirmPassword) {
      setFieldError('Passwords do not match.')
      return
    }
    if (password.length < 6) {
      setFieldError('Password must be at least 6 characters.')
      return
    }
    setSubmitting(true)
    try {
      await confirmPasswordReset(auth, oobCode, password)
      sessionStorage.setItem('authFlash', 'Password updated. You can now sign in.')
      navigate('/', { replace: true })
    } catch (err) {
      setFieldError(friendlyError(err.code))
      setSubmitting(false)
    }
  }

  if (status === 'loading') {
    return (
      <div className="login-shell">
        <div className="login-card">
          <div className="login-brand">
            <span className="logo-wrap">
              <img src="/logo.png" alt="PsychMetric" className="login-logo" />
            </span>
          </div>
          <p style={{ textAlign: 'center', color: 'var(--color-muted, #6b7280)' }}>Processing…</p>
        </div>
      </div>
    )
  }

  if (status === 'error') {
    return (
      <div className="login-shell">
        <div className="login-card">
          <div className="login-brand">
            <span className="logo-wrap">
              <img src="/logo.png" alt="PsychMetric" className="login-logo" />
            </span>
          </div>
          <p className="auth-message error" role="alert">{errorMessage}</p>
          <a href="/" className="primary-button full-width" style={{ textAlign: 'center', display: 'block', marginTop: '1rem' }}>
            Back to sign in
          </a>
        </div>
      </div>
    )
  }

  return (
    <div className="login-shell">
      <div className="login-card">
        <div className="login-brand">
          <span className="logo-wrap">
            <img src="/logo.png" alt="PsychMetric" className="login-logo" />
          </span>
        </div>
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
            {submitting ? 'Updating…' : 'Set password'}
          </button>
        </form>
      </div>
    </div>
  )
}

function friendlyError(code) {
  const map = {
    'auth/expired-action-code': 'This link has expired. Please request a new one.',
    'auth/invalid-action-code': 'This link is invalid or has already been used.',
    'auth/user-disabled': 'This account has been disabled.',
    'auth/user-not-found': 'No account found for this link.',
    'auth/weak-password': 'Password must be at least 6 characters.',
  }
  return map[code] ?? 'Something went wrong. Please try again.'
}

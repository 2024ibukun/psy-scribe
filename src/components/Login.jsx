import { useEffect, useState } from "react";
import {
  signInWithEmailAndPassword,
  signInWithPopup,
  sendSignInLinkToEmail,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
} from "firebase/auth";
import { auth, googleProvider } from "../firebase";

const ACTION_CODE_SETTINGS = {
  url: 'https://psychmetric.app/auth/action',
  handleCodeInApp: true,
};

export default function Login() {
  const [emailMode,     setEmailMode]     = useState("signin"); // "signin" | "signup"
  const [showMagicLink, setShowMagicLink] = useState(false);
  const [showForgotPw,  setShowForgotPw]  = useState(false);
  const [email,         setEmail]         = useState("");
  const [password,      setPassword]      = useState("");
  const [status,        setStatus]        = useState({ type: "", message: "" });
  const [loading,       setLoading]       = useState(false);

  useEffect(() => {
    const flash = sessionStorage.getItem("authFlash");
    if (flash) {
      sessionStorage.removeItem("authFlash");
      setStatus({ type: "info", message: flash });
    }
  }, []);

  function setError(message) { setStatus({ type: "error", message }); }
  function setInfo(message)  { setStatus({ type: "info",  message }); }
  function clearStatus()     { setStatus({ type: "", message: "" }); }

  async function handleEmailAuth(e) {
    e.preventDefault();
    clearStatus();
    setLoading(true);
    try {
      if (emailMode === "signup") {
        await createUserWithEmailAndPassword(auth, email, password);
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }
    } catch (err) {
      setError(friendlyError(err.code));
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogle() {
    clearStatus();
    setLoading(true);
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err) {
      if (err.code !== "auth/popup-closed-by-user") {
        setError(friendlyError(err.code));
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleMagicLink(e) {
    e.preventDefault();
    clearStatus();
    setLoading(true);
    try {
      await sendSignInLinkToEmail(auth, email, ACTION_CODE_SETTINGS);
      window.localStorage.setItem("emailForSignIn", email);
      setInfo(`Sign-in link sent to ${email}. Check your inbox.`);
    } catch (err) {
      setError(friendlyError(err.code));
    } finally {
      setLoading(false);
    }
  }

  async function handleForgotPassword(e) {
    e.preventDefault();
    clearStatus();
    setLoading(true);
    try {
      await sendPasswordResetEmail(auth, email, {
        url: 'https://psychmetric.app/auth/action',
        handleCodeInApp: true,
      });
      setInfo(`Password reset link sent to ${email}. Check your inbox.`);
      setShowForgotPw(false);
    } catch (err) {
      setError(friendlyError(err.code));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="login-shell">
      <div className="login-card">

        {/* Logo */}
        <div className="login-brand">
          <span className="logo-wrap">
            <img src="/logo.png" alt="PsychMetric" className="login-logo" />
          </span>
        </div>

        {/* Status / flash messages */}
        {status.message && (
          <p className={`auth-message ${status.type}`} role="alert" style={{ marginBottom: "1rem" }}>
            {status.message}
          </p>
        )}

        {/* ── PRIMARY: Google ─────────────────────────────── */}
        <button
          className="google-button google-button--primary"
          onClick={handleGoogle}
          disabled={loading}
          type="button"
        >
          <GoogleIcon />
          Continue with Google
        </button>

        <div className="login-divider"><span>or</span></div>

        {/* ── SECONDARY: Email / Password ─────────────────── */}
        {!showForgotPw ? (
          <form className="login-form" onSubmit={handleEmailAuth} noValidate>
            <label className="field-label" htmlFor="ep-email">Email</label>
            <input
              id="ep-email"
              type="email"
              className="field-input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              autoComplete="email"
              required
            />
            <label className="field-label" htmlFor="ep-password">Password</label>
            <input
              id="ep-password"
              type="password"
              className="field-input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={emailMode === "signup" ? "Create a password" : "Your password"}
              autoComplete={emailMode === "signup" ? "new-password" : "current-password"}
              required
            />
            <button type="submit" className="primary-button full-width" disabled={loading}>
              {loading ? "Please wait…" : emailMode === "signup" ? "Create account" : "Sign in"}
            </button>
            <div className="login-form-sub">
              {emailMode === "signin" && (
                <button
                  type="button"
                  className="login-text-link"
                  onClick={() => { setShowForgotPw(true); clearStatus(); }}
                >
                  Forgot password?
                </button>
              )}
              <button
                type="button"
                className="login-text-link"
                onClick={() => {
                  setEmailMode(emailMode === "signin" ? "signup" : "signin");
                  clearStatus();
                }}
              >
                {emailMode === "signin" ? "Create an account" : "Sign in instead"}
              </button>
            </div>
          </form>
        ) : (
          <form className="login-form" onSubmit={handleForgotPassword} noValidate>
            <p className="login-form-hint">
              Enter your email and we'll send you a password reset link.
            </p>
            <label className="field-label" htmlFor="fp-email">Email</label>
            <input
              id="fp-email"
              type="email"
              className="field-input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              autoComplete="email"
              required
            />
            <button type="submit" className="primary-button full-width" disabled={loading}>
              {loading ? "Sending…" : "Send reset link"}
            </button>
            <button
              type="button"
              className="login-text-link"
              style={{ marginTop: "6px" }}
              onClick={() => { setShowForgotPw(false); clearStatus(); }}
            >
              ← Back to sign in
            </button>
          </form>
        )}

        <div className="login-divider"><span>or</span></div>

        {/* ── TERTIARY: Magic link ─────────────────────────── */}
        {!showMagicLink ? (
          <p className="login-magic-hint">
            Prefer a passwordless link?{" "}
            <button
              type="button"
              className="login-text-link login-text-link--inline"
              onClick={() => { setShowMagicLink(true); clearStatus(); }}
            >
              Send me a magic link
            </button>
          </p>
        ) : (
          <form className="login-form" onSubmit={handleMagicLink} noValidate>
            <label className="field-label" htmlFor="magic-email">Email</label>
            <input
              id="magic-email"
              type="email"
              className="field-input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              autoComplete="email"
              required
            />
            <button
              type="submit"
              className="primary-button--outlined full-width"
              disabled={loading}
            >
              {loading ? "Sending…" : "Send magic link"}
            </button>
            <button
              type="button"
              className="login-text-link"
              style={{ marginTop: "6px" }}
              onClick={() => { setShowMagicLink(false); clearStatus(); }}
            >
              Cancel
            </button>
          </form>
        )}

        <p className="login-footer">For authorized clinical staff only. All activity is logged.</p>
      </div>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
      <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615Z" />
      <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18Z" />
      <path fill="#FBBC05" d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332Z" />
      <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58Z" />
    </svg>
  );
}

function friendlyError(code) {
  const map = {
    "auth/user-not-found":        "No account found with that email.",
    "auth/wrong-password":        "Incorrect password.",
    "auth/email-already-in-use":  "An account with this email already exists.",
    "auth/weak-password":         "Password must be at least 6 characters.",
    "auth/invalid-email":         "Please enter a valid email address.",
    "auth/too-many-requests":     "Too many attempts. Please try again later.",
    "auth/network-request-failed":"Network error. Check your connection.",
    "auth/invalid-credential":    "Invalid email or password.",
  };
  return map[code] ?? "Something went wrong. Please try again.";
}

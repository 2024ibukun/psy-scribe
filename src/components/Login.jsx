import { useEffect, useState } from "react";
import {
  signInWithEmailAndPassword,
  signInWithPopup,
  sendSignInLinkToEmail,
  createUserWithEmailAndPassword,
} from "firebase/auth";
import { auth, googleProvider } from "../firebase";

const ACTION_CODE_SETTINGS = {
  url: window.location.origin,
  handleCodeInApp: true,
};

export default function Login() {
  const [mode, setMode] = useState("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState({ type: "", message: "" });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const flash = sessionStorage.getItem("authFlash");
    if (flash) {
      sessionStorage.removeItem("authFlash");
      setStatus({ type: "info", message: flash });
    }
  }, []);

  function setError(message) { setStatus({ type: "error", message }); }
  function setInfo(message) { setStatus({ type: "info", message }); }

  async function handleEmailAuth(e) {
    e.preventDefault();
    setStatus({ type: "", message: "" });
    setLoading(true);
    try {
      if (mode === "signup") {
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
    setStatus({ type: "", message: "" });
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
    setStatus({ type: "", message: "" });
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

  return (
    <div className="login-shell">
      <div className="login-card">
        <div className="login-brand">
          <span className="logo-wrap">
            <img src="/logo.png" alt="PsychMetric" className="login-logo" />
          </span>
        </div>

        <div className="login-tabs" role="tablist">
          <button role="tab" aria-selected={mode === "signin"} className={mode === "signin" ? "active" : ""} onClick={() => { setMode("signin"); setStatus({ type: "", message: "" }); }}>Sign in</button>
          <button role="tab" aria-selected={mode === "signup"} className={mode === "signup" ? "active" : ""} onClick={() => { setMode("signup"); setStatus({ type: "", message: "" }); }}>Create account</button>
          <button role="tab" aria-selected={mode === "magic"} className={mode === "magic" ? "active" : ""} onClick={() => { setMode("magic"); setStatus({ type: "", message: "" }); }}>Magic link</button>
        </div>

        {mode !== "magic" && (
          <form className="login-form" onSubmit={handleEmailAuth} noValidate>
            <label className="field-label" htmlFor="email">Email</label>
            <input id="email" type="email" className="field-input" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" autoComplete="email" required />
            <label className="field-label" htmlFor="password">Password</label>
            <input id="password" type="password" className="field-input" value={password} onChange={(e) => setPassword(e.target.value)} placeholder={mode === "signup" ? "Create a password" : "Your password"} autoComplete={mode === "signup" ? "new-password" : "current-password"} required />
            {status.message && <p className={`auth-message ${status.type}`} role="alert">{status.message}</p>}
            <button type="submit" className="primary-button full-width" disabled={loading}>
              {loading ? "Please wait…" : mode === "signup" ? "Create account" : "Sign in"}
            </button>
          </form>
        )}

        {mode === "magic" && (
          <form className="login-form" onSubmit={handleMagicLink} noValidate>
            <p className="magic-description">Enter your email and we'll send you a one-click sign-in link — no password needed.</p>
            <label className="field-label" htmlFor="magic-email">Email</label>
            <input id="magic-email" type="email" className="field-input" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" autoComplete="email" required />
            {status.message && <p className={`auth-message ${status.type}`} role="alert">{status.message}</p>}
            <button type="submit" className="primary-button full-width" disabled={loading}>
              {loading ? "Sending…" : "Send sign-in link"}
            </button>
          </form>
        )}

        <div className="login-divider"><span>or</span></div>

        <button className="google-button" onClick={handleGoogle} disabled={loading} type="button">
          <GoogleIcon />
          Continue with Google
        </button>

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
    "auth/user-not-found": "No account found with that email.",
    "auth/wrong-password": "Incorrect password.",
    "auth/email-already-in-use": "An account with this email already exists.",
    "auth/weak-password": "Password must be at least 6 characters.",
    "auth/invalid-email": "Please enter a valid email address.",
    "auth/too-many-requests": "Too many attempts. Please try again later.",
    "auth/network-request-failed": "Network error. Check your connection.",
    "auth/invalid-credential": "Invalid email or password.",
  };
  return map[code] ?? "Something went wrong. Please try again.";
}

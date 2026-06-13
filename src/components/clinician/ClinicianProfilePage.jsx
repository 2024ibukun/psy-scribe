import { useState, useEffect } from "react"
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore"
import { db } from "../../firebase"

export default function ClinicianProfilePage({ user }) {
  const [clinicianName,  setClinicianName]  = useState("")
  const [clinicName,     setClinicName]     = useState("")
  const [clinicPhone,    setClinicPhone]    = useState("")
  const [clinicAddress,  setClinicAddress]  = useState("")
  const [loading,  setLoading]  = useState(true)
  const [saving,   setSaving]   = useState(false)
  const [saved,    setSaved]    = useState(false)
  const [error,    setError]    = useState("")

  useEffect(() => {
    async function loadProfile() {
      try {
        const snap = await getDoc(doc(db, "clinicianProfiles", user.uid))
        if (snap.exists()) {
          const d = snap.data()
          setClinicianName(d.clinicianName  || "")
          setClinicName(d.clinicName      || "")
          setClinicPhone(d.clinicPhone    || "")
          setClinicAddress(d.clinicAddress || "")
        }
      } catch (err) {
        console.error("[Profile] load error:", err)
      } finally {
        setLoading(false)
      }
    }
    loadProfile()
  }, [user.uid])

  async function handleSave(e) {
    e.preventDefault()
    setError("")
    if (!clinicianName.trim()) {
      setError("Clinician name is required.")
      return
    }
    if (!clinicName.trim()) {
      setError("Clinic name is required.")
      return
    }
    setSaving(true)
    try {
      await setDoc(
        doc(db, "clinicianProfiles", user.uid),
        {
          clinicianName:  clinicianName.trim(),
          clinicName:     clinicName.trim(),
          clinicPhone:    clinicPhone.trim(),
          clinicAddress:  clinicAddress.trim(),
          updatedAt:      serverTimestamp(),
        },
        { merge: true }
      )
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch (err) {
      console.error("[Profile] save error:", err)
      setError("Failed to save. Please try again.")
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <section className="placeholder-page">
        <p className="intake-loading">Loading profile…</p>
      </section>
    )
  }

  return (
    <section className="placeholder-page">
      <div className="placeholder-copy">
        <p className="eyebrow">Settings</p>
        <h1>Clinician Profile</h1>
        <p>
          Your name and clinic appear on every patient intake form.
          Set this once — patients will immediately recognise your practice
          when they open an intake link.
        </p>
      </div>

      <form className="profile-form" onSubmit={handleSave} noValidate>
        <div className="intake-card profile-form__card">
          <h2 className="intake-section-title">Your Identity</h2>

          <div className="intake-field">
            <label className="intake-label" htmlFor="p-clinician">
              Clinician Name
              <span className="intake-label-required" aria-hidden="true"> *</span>
            </label>
            <input
              id="p-clinician"
              type="text"
              className="intake-input"
              value={clinicianName}
              onChange={(e) => setClinicianName(e.target.value)}
              placeholder="e.g. Dr. Ade Johnson"
              autoComplete="name"
            />
          </div>

          <div className="intake-field">
            <label className="intake-label" htmlFor="p-clinic">
              Clinic Name
              <span className="intake-label-required" aria-hidden="true"> *</span>
            </label>
            <input
              id="p-clinic"
              type="text"
              className="intake-input"
              value={clinicName}
              onChange={(e) => setClinicName(e.target.value)}
              placeholder="e.g. Serenity Psychiatry"
              autoComplete="organization"
            />
          </div>

          <div className="intake-field">
            <label className="intake-label" htmlFor="p-phone">
              Clinic Phone (optional)
            </label>
            <input
              id="p-phone"
              type="tel"
              className="intake-input"
              value={clinicPhone}
              onChange={(e) => setClinicPhone(e.target.value)}
              placeholder="e.g. (555) 123-4567"
              autoComplete="tel"
            />
            <p className="intake-field-helper">
              Shown on the patient intake page so patients can call with questions.
            </p>
          </div>

          <div className="intake-field">
            <label className="intake-label" htmlFor="p-address">
              Clinic Address (optional)
            </label>
            <textarea
              id="p-address"
              className="intake-textarea"
              value={clinicAddress}
              onChange={(e) => setClinicAddress(e.target.value)}
              placeholder={"123 Main Street, Suite 100\nSpringfield, IL 62701"}
              rows={3}
              autoComplete="street-address"
            />
            <p className="intake-field-helper">
              Appears in the letterhead of StatForm clinical letters.
            </p>
          </div>

          {error && <p className="intake-error" role="alert">{error}</p>}

          <button
            type="submit"
            className={`intake-primary-btn profile-save-btn${saved ? " profile-save-btn--saved" : ""}`}
            disabled={saving}
          >
            {saving ? "Saving…" : saved ? "Saved ✓" : "Save Profile"}
          </button>
        </div>

        {/* Live preview of what the patient will see */}
        {(clinicianName.trim() || clinicName.trim()) && (
          <div className="profile-preview">
            <p className="profile-preview__label">Patient will see:</p>
            <div className="clinic-identity-banner">
              {clinicName.trim() && (
                <h2 className="clinic-identity__name">{clinicName}</h2>
              )}
              {clinicianName.trim() && (
                <p className="clinic-identity__request">
                  {clinicianName} has requested that you complete a brief intake before your visit.
                </p>
              )}
              {clinicAddress.trim() && (
                <p className="clinic-identity__phone" style={{ whiteSpace: "pre-line" }}>
                  {clinicAddress.trim()}
                </p>
              )}
              {clinicPhone.trim() && (
                <p className="clinic-identity__phone">Questions? Call {clinicPhone}</p>
              )}
            </div>
          </div>
        )}
      </form>
    </section>
  )
}

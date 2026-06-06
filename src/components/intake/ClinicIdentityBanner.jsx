/**
 * ClinicIdentityBanner
 *
 * Shared component — used by adult intake page and future pediatric intake.
 * Shows the clinic and clinician identity at the top of the patient page
 * so patients immediately recognise their provider before filling out anything.
 *
 * Props:
 *   profile — clinicianProfiles document data, or null/undefined
 *
 * If profile is missing or incomplete, renders a graceful fallback.
 * Never shows a broken or empty name.
 */
export default function ClinicIdentityBanner({ profile }) {
  const hasClinic    = profile?.clinicName?.trim()
  const hasClinician = profile?.clinicianName?.trim()

  if (!hasClinic && !hasClinician) {
    return (
      <div className="clinic-identity-banner clinic-identity-banner--fallback">
        <p className="clinic-identity__request">
          Your clinician has requested that you complete a brief intake before your visit.
        </p>
      </div>
    )
  }

  return (
    <div className="clinic-identity-banner">
      {hasClinic && (
        <h2 className="clinic-identity__name">{profile.clinicName}</h2>
      )}
      {hasClinician && (
        <p className="clinic-identity__request">
          {profile.clinicianName} has requested that you complete a brief intake before your visit.
        </p>
      )}
      {profile?.clinicPhone?.trim() && (
        <p className="clinic-identity__phone">
          Questions? Call {profile.clinicPhone}
        </p>
      )}
    </div>
  )
}

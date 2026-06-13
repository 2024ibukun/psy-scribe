import { Link } from "react-router-dom"
import LetterShell from "./LetterShell"

export default function AbsenceExcusePage({ user }) {
  return (
    <section className="placeholder-page">
      <div className="placeholder-copy">
        <p className="eyebrow">
          <Link to="/statform" className="letter-breadcrumb">StatForm</Link>
          {" / "}Absence Excuse Letter
        </p>
        <h1>Absence Excuse Letter</h1>
        <p>
          Confirm a patient's medical appointment or treatment absence for work or school.
          Fill in the fields on the left — the letter preview updates in real time.
        </p>
      </div>

      <LetterShell user={user} bodyContent="">
        {/* Body-specific fields will be added in Part 3 */}
        <p className="letter-shell__body-placeholder">
          Appointment-specific fields coming soon — the letter structure is live above.
        </p>
      </LetterShell>
    </section>
  )
}

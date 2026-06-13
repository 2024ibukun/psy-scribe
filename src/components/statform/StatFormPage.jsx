import { useState } from "react"
import { useNavigate } from "react-router-dom"
import StatusBadge from "../assessments/StatusBadge"

const LETTER_TYPES = [
  {
    id: "absence-excuse",
    title: "Absence Excuse Letter",
    description: "Confirm a patient's medical appointment or treatment absence for work or school.",
    status: "active",
    route: "/statform/absence-excuse",
  },
  {
    id: "return-to-work",
    title: "Return to Work / School Letter",
    description: "Clear a patient to return to work or school following a medical absence.",
    status: "coming-soon",
  },
  {
    id: "school-accommodation",
    title: "School Accommodation Letter",
    description: "Request academic accommodations for a diagnosed psychiatric condition.",
    status: "coming-soon",
  },
  {
    id: "housing-accommodation",
    title: "Housing Accommodation Letter",
    description: "Document psychiatric need for a housing accommodation or exception.",
    status: "coming-soon",
  },
]

export default function StatFormPage() {
  const navigate = useNavigate()
  const [toast, setToast] = useState(null)

  function handleCardClick(letter) {
    if (letter.status === "active") {
      navigate(letter.route)
    } else {
      setToast(`${letter.title} is coming soon.`)
      setTimeout(() => setToast(null), 2500)
    }
  }

  return (
    <section className="placeholder-page">
      {toast && (
        <div className="workspace-toast" role="status" aria-live="polite">
          {toast}
        </div>
      )}

      <div className="placeholder-copy">
        <p className="eyebrow">StatForm</p>
        <h1>StatForm</h1>
        <p>
          Generate common clinical letters in minutes — pre-filled with your
          clinic information.
        </p>
      </div>

      <div className="statform-grid">
        {LETTER_TYPES.map((letter) => (
          <button
            key={letter.id}
            type="button"
            className={`statform-card${letter.status === "active" ? " statform-card--active" : ""}`}
            onClick={() => handleCardClick(letter)}
            aria-label={`${letter.title} — ${letter.status === "active" ? "open" : "coming soon"}`}
          >
            <div className="statform-card__header">
              <h3 className="statform-card__title">{letter.title}</h3>
              <StatusBadge status={letter.status} />
            </div>
            <p className="statform-card__desc">{letter.description}</p>
          </button>
        ))}
      </div>
    </section>
  )
}

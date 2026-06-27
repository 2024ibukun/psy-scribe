import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { ACCORDION_SECTIONS } from "../../data/assessments"
import AssessmentCard from "./AssessmentCard"

function ChevronIcon({ open }) {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      style={{ transform: open ? "rotate(180deg)" : "none", transition: "transform 200ms" }}
    >
      <polyline points="6 9 12 15 18 9" />
    </svg>
  )
}

export default function AssessmentCategoryAccordion({ assessments, mode, onToast }) {
  const navigate = useNavigate()
  const defaultOpen = mode === "pediatric" ? "child" : "adult"
  const [openSection, setOpenSection] = useState(defaultOpen)

  function toggle(key) {
    setOpenSection((prev) => (prev === key ? null : key))
  }

  function getAssessmentsForSection(sectionKey) {
    const seen = new Set()
    return assessments.filter((a) => {
      const sections = Array.isArray(a.section) ? a.section : [a.section]
      if (!sections.includes(sectionKey)) return false
      if (seen.has(a.id)) return false
      seen.add(a.id)
      return true
    })
  }

  return (
    <div>
      <h2 className="workspace-section-title">All Assessments by Category</h2>
      <div className="accordion">
        {ACCORDION_SECTIONS.map(({ key, label }) => {
          const items = getAssessmentsForSection(key)
          const isOpen = openSection === key
          return (
            <div key={key} className="accordion__item">
              <button
                type="button"
                className="accordion__header"
                onClick={() => toggle(key)}
                aria-expanded={isOpen}
              >
                <span className="accordion__label">
                  {label}
                  <span className="accordion__count">{items.length}</span>
                </span>
                <ChevronIcon open={isOpen} />
              </button>
              {isOpen && (
                <div className="accordion__body">
                  {items.length === 0 ? (
                    <p className="accordion__empty">No assessments in this category.</p>
                  ) : (
                    <div className="assessment-grid">
                      {items.map((assessment) => (
                        <AssessmentCard
                          key={assessment.id + "-" + key}
                          assessment={assessment}
                          onToast={onToast}
                          onSendToTeacher={assessment.id === "vanderbilt" ? () => navigate("/workspace/vanderbilt") : undefined}
                          hideSendToPatient={assessment.id === "vanderbilt"}
                          hideCompleteInOffice={assessment.id === "vanderbilt"}
                        />
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

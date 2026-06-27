import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { assessments } from "../../data/assessments"
import AssessmentModeToggle from "./AssessmentModeToggle"
import AssessmentSearch from "./AssessmentSearch"
import FeaturedAssessmentGrid from "./FeaturedAssessmentGrid"
import AssessmentCategoryAccordion from "./AssessmentCategoryAccordion"
import AssessmentCard from "./AssessmentCard"

export default function AssessmentWorkspace() {
  const navigate = useNavigate()
  const [mode, setMode] = useState("adult")
  const [searchQuery, setSearchQuery] = useState("")
  const [toast, setToast] = useState(null)

  function showToast(message) {
    setToast(message)
  }

  useEffect(() => {
    if (!toast) return
    const timer = setTimeout(() => setToast(null), 2500)
    return () => clearTimeout(timer)
  }, [toast])

  const searchResults = searchQuery.trim()
    ? assessments.filter((a) =>
        a.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        a.fullName.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : null

  function handleModeChange(newMode) {
    setMode(newMode)
    setSearchQuery("")
  }

  return (
    <div className="assessment-workspace">
      {toast && (
        <div className="workspace-toast" role="status" aria-live="polite">
          {toast} — this feature is coming soon.
        </div>
      )}

      <div className="workspace-controls">
        <AssessmentModeToggle mode={mode} onModeChange={handleModeChange} />
        <AssessmentSearch onSearch={setSearchQuery} />
      </div>

      {searchResults ? (
        <div className="workspace-search-results">
          <p className="workspace-search-label">
            {searchResults.length === 0
              ? "No assessments found"
              : `${searchResults.length} result${searchResults.length !== 1 ? "s" : ""} for "${searchQuery}"`}
          </p>
          {searchResults.length > 0 && (
            <div className="assessment-grid">
              {searchResults.map((assessment) => (
                <AssessmentCard
                  key={assessment.id}
                  assessment={assessment}
                  onToast={showToast}
                  onSendToTeacher={assessment.id === "vanderbilt" ? () => navigate("/workspace/vanderbilt") : undefined}
                />
              ))}
            </div>
          )}
        </div>
      ) : (
        <>
          <FeaturedAssessmentGrid mode={mode} onToast={showToast} />
          <AssessmentCategoryAccordion
            assessments={assessments}
            mode={mode}
            onToast={showToast}
          />
        </>
      )}

      <p className="workspace-disclaimer">
        Assessment availability may vary based on licensing requirements, clinical permissions,
        and organizational configuration.
      </p>
    </div>
  )
}

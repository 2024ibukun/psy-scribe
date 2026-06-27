import { useNavigate } from "react-router-dom"
import { assessments, ADULT_FEATURED_IDS, PEDIATRIC_FEATURED_IDS } from "../../data/assessments"
import AssessmentCard from "./AssessmentCard"

export default function FeaturedAssessmentGrid({ mode, onToast }) {
  const navigate = useNavigate()
  const featuredIds = mode === "adult" ? ADULT_FEATURED_IDS : PEDIATRIC_FEATURED_IDS
  const byId = Object.fromEntries(assessments.map((a) => [a.id, a]))
  const featured = featuredIds.map((id) => byId[id]).filter(Boolean)

  return (
    <div>
      <h2 className="workspace-section-title">Featured Assessments</h2>
      <div className="assessment-grid assessment-grid--featured">
        {featured.map((assessment) => (
          <AssessmentCard
            key={assessment.id}
            assessment={assessment}
            onToast={onToast}
            onSendToTeacher={assessment.id === "vanderbilt" ? () => navigate("/workspace/vanderbilt") : undefined}
            hideSendToPatient={assessment.id === "vanderbilt"}
            hideCompleteInOffice={assessment.id === "vanderbilt"}
          />
        ))}
      </div>
    </div>
  )
}

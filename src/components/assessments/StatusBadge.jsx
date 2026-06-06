export default function StatusBadge({ status }) {
  const styles = {
    active: { background: "#d1fae5", color: "#065f46", label: "Active" },
    beta: { background: "#fef3c7", color: "#92400e", label: "Beta" },
    "coming-soon": { background: "#f3f4f6", color: "#6b7280", label: "Coming Soon" },
  }
  const s = styles[status] ?? styles["coming-soon"]
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        padding: "2px 8px",
        borderRadius: "999px",
        fontSize: "0.7rem",
        fontWeight: 700,
        background: s.background,
        color: s.color,
        letterSpacing: "0.03em",
      }}
    >
      {s.label}
    </span>
  )
}

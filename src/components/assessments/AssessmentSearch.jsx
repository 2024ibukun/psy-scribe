import { useState } from "react"

export default function AssessmentSearch({ onSearch }) {
  const [query, setQuery] = useState("")

  function handleChange(e) {
    setQuery(e.target.value)
    onSearch(e.target.value)
  }

  function handleClear() {
    setQuery("")
    onSearch("")
  }

  return (
    <div className="assessment-search">
      <svg
        className="assessment-search__icon"
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <circle cx="11" cy="11" r="8" />
        <line x1="21" y1="21" x2="16.65" y2="16.65" />
      </svg>
      <input
        type="search"
        className="assessment-search__input"
        placeholder="Search assessments..."
        value={query}
        onChange={handleChange}
        aria-label="Search assessments"
      />
      {query && (
        <button
          type="button"
          className="assessment-search__clear"
          onClick={handleClear}
          aria-label="Clear search"
        >
          ✕
        </button>
      )}
    </div>
  )
}

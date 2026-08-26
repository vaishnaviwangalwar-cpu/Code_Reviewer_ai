function ReviewResults({ issues, streamingText, isStreaming }) {
  const severityColors = {
    critical: "#e74c3c",
    warning: "#f39c12",
    info: "#3498db",
  };

  const categoryLabels = {
    bug: "Bug",
    security: "Security",
    performance: "Performance",
    style: "Style",
  };

  if (!isStreaming && issues.length === 0 && !streamingText) {
    return (
      <div className="results-empty">
        <p>Submit code above to see AI-powered review results.</p>
      </div>
    );
  }
    return (
    <div className="results">
      {isStreaming && (
        <div className="streaming-indicator">
          <span className="pulse"></span> Analyzing code...
          {streamingText && (
            <pre className="streaming-preview">{streamingText}</pre>
          )}
        </div>
      )}
      {issues.length > 0 && (
        <div className="issues-list">
          <h2>Found {issues.length} issue{issues.length !== 1 ? "s" : ""}</h2>
          {issues.map((issue, index) => (
            <div key={index} className="issue-card">
              <div className="issue-header">
                <span
                  className="severity-badge"
                  style={{ backgroundColor: severityColors[issue.severity] }}
                >
                  {issue.severity}
                </span>
                <span className="category-badge">
                  {categoryLabels[issue.category] || issue.category}
                </span>
                <h3>{issue.title}</h3>
              </div>
              <p>{issue.description}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default ReviewResults;
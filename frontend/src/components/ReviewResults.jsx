import { useState } from "react";
function ReviewResults({ issues, streamingText, isStreaming, originalCode }) {
  // Track the fixed code for each issue by its index
  const [fixedCode, setFixedCode] = useState({});
  const [fixingIndex, setFixingIndex] = useState(null);

  const categoryLabels = {
    bug: "Bug",
    security: "Security",
    performance: "Performance",
    style: "Style",
  };

    const handleFix = async (issue, index) => {
    setFixingIndex(index);
    setFixedCode((prev) => ({ ...prev, [index]: "" }));

    try {
      // Send the original code and issue details to the fix endpoint
      const response = await fetch("http://localhost:8000/review/fix", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: originalCode,
          issue_title: issue.title,
          issue_description: issue.description,
        }),
      });
            // Read the SSE stream and update the fixed code as chunks arrive
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let fullFix = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const text = decoder.decode(value);
        const lines = text.split("\n");
        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const data = JSON.parse(line.slice(6));
            if (data.chunk) {
              fullFix += data.chunk;
              setFixedCode((prev) => ({ ...prev, [index]: fullFix }));
            }
          }
        }
      }
    } catch (error) {
      console.error("Fix error:", error);
    } finally {
      setFixingIndex(null);
    }
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
                                <button
                  className="fix-button"
                  onClick={() => handleFix(issue, index)}
                  disabled={fixingIndex === index}
                >
                  {fixingIndex === index ? "Fixing..." : "Fix It"}
                </button>
              </div>
              <p>{issue.description}</p>
                            {fixedCode[index] !== undefined && (
                <div className="diff-view">
                  <div className="diff-panel diff-original">
                    <h4>Original</h4>
                    <pre>{originalCode}</pre>
                  </div>
                  <div className="diff-panel diff-fixed">
                    <h4>Fixed</h4>
                    <pre>{fixedCode[index]}</pre>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default ReviewResults;
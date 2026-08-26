import { useState } from "react";

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

function cleanCode(code) {
  if (!code) return "";
  let clean = code.trim();
  // Strip markdown code fences if Gemini outputs them
  if (clean.startsWith("```")) {
    const firstNewline = clean.indexOf("\n");
    if (firstNewline !== -1) {
      clean = clean.slice(firstNewline + 1);
    } else {
      clean = "";
    }
  }
  if (clean.endsWith("```")) {
    clean = clean.slice(0, -3);
  }
  return clean.trim();
}

function ReviewResults({ issues, streamingText, isStreaming, originalCode }) {
  // Track the fixed code for each issue by its index
  const [fixedCode, setFixedCode] = useState({});
  const [fixingIndex, setFixingIndex] = useState(null);

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

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      // Read the SSE stream and update the fixed code as chunks arrive
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let accumulatedText = "";
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          const trimmed = line.trim();
          if (trimmed.startsWith("data: ")) {
            try {
              const data = JSON.parse(trimmed.slice(6));
              if (data.chunk) {
                accumulatedText = accumulatedText + data.chunk;
                const latestFix = accumulatedText;
                setFixedCode((prev) => ({ ...prev, [index]: latestFix }));
              }
            } catch (err) {
              console.error("Failed to parse fix SSE JSON:", err);
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
                  className={`severity-badge ${issue.severity}`}
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
                    <pre>{cleanCode(fixedCode[index]) || (fixingIndex === index ? "Fixing code..." : fixedCode[index])}</pre>
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

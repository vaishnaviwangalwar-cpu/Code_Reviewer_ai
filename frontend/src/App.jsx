import { useState } from "react";
import CodeInput from "./components/CodeInput";
import ReviewResults from "./components/ReviewResults";
import ReviewHistory from "./components/ReviewHistory";
import "./App.css";

function App() {
  const [issues, setIssues] = useState([]);
  const [streamingText, setStreamingText] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [activeTab, setActiveTab] = useState("review");

  const handleSubmit = async (code) => {
    setIssues([]);
    setStreamingText("");
    setIsStreaming(true);

    try {
      const response = await fetch("http://localhost:8000/review/stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let fullText = "";

            while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const text = decoder.decode(value);
        const lines = text.split("\n");

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const data = JSON.parse(line.slice(6));
            if (data.chunk) {
              fullText += data.chunk;
              setStreamingText(fullText);
            }
            if (data.done && data.issues) {
              setIssues(data.issues);
              setStreamingText("");
            }
          }
        }
      }
    } catch (error) {
      console.error("Stream error:", error);
    } finally {
      setIsStreaming(false);
    }
  };

  
  return (
    <div className="app">
      <header className="header">
        <h1>CodeLens</h1>
        <p>AI-Powered Code Review Dashboard</p>
        <nav className="tabs">
          <button
            className={activeTab === "review" ? "active" : ""}
            onClick={() => setActiveTab("review")}
          >
            New Review
          </button>
          <button
            className={activeTab === "history" ? "active" : ""}
            onClick={() => setActiveTab("history")}
          >
            History
          </button>
        </nav>
      </header>

            <main>
        {activeTab === "review" ? (
          <>
            <CodeInput onSubmit={handleSubmit} isStreaming={isStreaming} />
            <ReviewResults
              issues={issues}
              streamingText={streamingText}
              isStreaming={isStreaming}
            />
          </>
        ) : (
          <ReviewHistory />
        )}
      </main>
    </div>
  );
}

export default App;
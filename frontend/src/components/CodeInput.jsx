import { useState } from "react";

function CodeInput({ onSubmit, isStreaming }) {
  const [code, setCode] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    if (code.trim() && !isStreaming) {
      onSubmit(code);
    }
  };

  return (
    <form className="code-input" onSubmit={handleSubmit}>
      <textarea
        value={code}
        onChange={(e) => setCode(e.target.value)}
        placeholder="Paste your code here for review..."
        rows={12}
        disabled={isStreaming}
      />
      <button type="submit" disabled={isStreaming || !code.trim()}>
        {isStreaming ? "Reviewing..." : "Review Code"}
      </button>
    </form>
  );
}

export default CodeInput;

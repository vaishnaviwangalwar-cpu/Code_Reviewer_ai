import { useState, useEffect } from "react";

function ReviewHistory() {
  const [reviews, setReviews] = useState([]);
  const [selectedReview, setSelectedReview] = useState(null);
  const [filter, setFilter] = useState("all");

  const filteredIssues = selectedReview
    ? selectedReview.result.filter((issue) => filter === "all" || issue.category === filter)
    : [];

  // Fetch reviews from the API
  useEffect(() => {
    fetch("http://localhost:8000/reviews")
      .then((res) => res.json())
      .then((data) => setReviews(data))
      .catch((err) => console.error("Failed to fetch reviews:", err));
  }, []);

  return (
    <div className="history">
      <div className="history-list">
        <h2>Past Reviews</h2>
        {reviews.length === 0 && <p>No reviews yet. Submit your first code review.</p>}
        {reviews.map((review) => (
          <div
            key={review.id}
            className={`history-item ${selectedReview?.id === review.id ? "selected" : ""}`}
            onClick={() => setSelectedReview(review)}
          >
            <pre className="code-preview">
              {review.code.slice(0, 100)}
              {review.code.length > 100 ? "..." : ""}
            </pre>
            <span className="review-date">
              {new Date(review.created_at).toLocaleDateString()}
            </span>
            <span className="issue-count">
              {review.result.length} issue{review.result.length !== 1 ? "s" : ""}
            </span>
          </div>
        ))}
      </div>
      {selectedReview && (
        <div className="history-detail">
          <div className="filter-bar">
            {["all", "bug", "security", "performance", "style"].map((cat) => (
              <button
                key={cat}
                className={filter === cat ? "active" : ""}
                onClick={() => setFilter(cat)}
              >
                {cat.charAt(0).toUpperCase() + cat.slice(1)}
              </button>
            ))}
          </div>
          {filteredIssues.map((issue, index) => (
            <div key={index} className="issue-card">
              <div className="issue-header">
                <span className={`severity-badge ${issue.severity}`}>
                  {issue.severity}
                </span>
                <span className="category-badge">{issue.category}</span>
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

export default ReviewHistory;

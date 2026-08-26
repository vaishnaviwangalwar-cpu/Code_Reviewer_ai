import sqlite3
import json
from datetime import datetime


# Connect to the SQLite database file
def get_connection():
    conn = sqlite3.connect("reviews.db")
    conn.row_factory = sqlite3.Row
    return conn


# Create the reviews table if it doesn't exist yet
def init_db():
    conn = get_connection()
    conn.execute(
        """
        CREATE TABLE IF NOT EXISTS reviews (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            code TEXT NOT NULL,
            result TEXT NOT NULL,
            created_at TEXT NOT NULL
        )
        """
    )
    conn.commit()
    conn.close()

# Save a new review to the database and return its ID
def save_review(code: str, result: list) -> int:
    conn = get_connection()
    cursor = conn.execute(
        "INSERT INTO reviews (code, result, created_at) VALUES (?, ?, ?)",
        (code, json.dumps(result), datetime.now().isoformat()),
    )
    conn.commit()
    review_id = cursor.lastrowid
    conn.close()
    return review_id    

# Retrieve all reviews, newest first
def get_all_reviews() -> list:
    conn = get_connection()
    rows = conn.execute(
        "SELECT id, code, result, created_at FROM reviews ORDER BY created_at DESC"
    ).fetchall()
    conn.close()
    return [
        {
            "id": row["id"],
            "code": row["code"],
            "result": json.loads(row["result"]),
            "created_at": row["created_at"],
        }
        for row in rows
    ]


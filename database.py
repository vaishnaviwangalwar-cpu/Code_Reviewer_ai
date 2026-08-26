import sqlite3
import json
from datetime import datetime

def get_connection():
    conn = sqlite3.connect("reviews.db")
    conn.row_factory = sqlite3.Row
    return conn

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

def save_review(code, result):
    conn = get_connection()
    result_json = json.dumps(result)
    current_time = datetime.now().isoformat()
    conn.execute(
        "INSERT INTO reviews (code, result, created_at) VALUES (?, ?, ?)",
        (code, result_json, current_time)
    )
    conn.commit()
    conn.close()

def get_all_reviews():
    conn = get_connection()
    cursor = conn.execute("SELECT * FROM reviews")
    rows = cursor.fetchall()
    conn.close()
    
    reviews = []
    for row in rows:
        reviews.append({
            "id": row["id"],
            "code": row["code"],
            "result": json.loads(row["result"]),
            "created_at": row["created_at"]
        })
    return reviews

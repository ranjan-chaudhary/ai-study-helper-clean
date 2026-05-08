import sqlite3
import hashlib

conn = sqlite3.connect("users.db", check_same_thread=False)
cursor = conn.cursor()

# USERS TABLE
cursor.execute("""
CREATE TABLE IF NOT EXISTS users (
    email TEXT PRIMARY KEY,
    username TEXT,
    password TEXT
)
""")

# CHAT TABLE
cursor.execute("""
CREATE TABLE IF NOT EXISTS chats (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT,
    session_id TEXT,
    role TEXT,
    message TEXT
)
""")

# Migrate existing db to add session_id if it doesn't exist
try:
    cursor.execute("ALTER TABLE chats ADD COLUMN session_id TEXT")
except sqlite3.OperationalError:
    pass # column already exists

conn.commit()


def hash_password(password):
    return hashlib.sha256(password.encode()).hexdigest()


def add_user(email: str, username: str, password: str) -> bool:
    try:
        hashed = hash_password(password)
        cursor.execute(
            "INSERT INTO users (email, username, password) VALUES (?, ?, ?)",
            (email, username, hashed)
        )
        conn.commit()
        return True
    except:
        return False


def check_user(email, password):
    hashed = hash_password(password)
    cursor.execute(
        "SELECT * FROM users WHERE email=? AND password=?",
        (email, hashed)
    )
    return cursor.fetchone()


def reset_password(email, new_password):
    hashed = hash_password(new_password)
    cursor.execute(
        "UPDATE users SET password=? WHERE email=?",
        (hashed, email)
    )
    conn.commit()


def save_chat(email, session_id, role, message):
    cursor.execute(
        "INSERT INTO chats (email, session_id, role, message) VALUES (?, ?, ?, ?)",
        (email, session_id, role, message)
    )
    conn.commit()


def get_sessions(email):
    cursor.execute(
        "SELECT session_id, COUNT(id) as msg_count, MAX(id) as last_msg_id FROM chats WHERE email=? AND session_id IS NOT NULL GROUP BY session_id ORDER BY last_msg_id DESC",
        (email,)
    )
    return [{"session_id": row[0], "msg_count": row[1]} for row in cursor.fetchall()]


def get_session_history(email, session_id):
    cursor.execute(
        "SELECT role, message FROM chats WHERE email=? AND session_id=? ORDER BY id ASC",
        (email, session_id)
    )
    return [{"role": row[0], "content": row[1]} for row in cursor.fetchall()]


def delete_session(email, session_id):
    cursor.execute(
        "DELETE FROM chats WHERE email=? AND session_id=?",
        (email, session_id)
    )
    conn.commit()


def delete_all_sessions(email):
    cursor.execute(
        "DELETE FROM chats WHERE email=?",
        (email,)
    )
    conn.commit()
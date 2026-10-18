import os

import mysql.connector
from flask import Flask, abort, jsonify, request, send_from_directory

BASE_DIR = os.path.dirname(os.path.abspath(__file__))

# Only these files are served to the browser, so app.py and your
# database password are never exposed.
PAGES = {"index", "calendar", "about", "login", "signup", "profile"}

app = Flask(__name__)

DB_CONFIG = {
    "host": os.environ.get("DB_HOST", "127.0.0.1"),
    "user": os.environ.get("DB_USER", "root"),
    "password": os.environ.get("DB_PASSWORD", "Swhgzk#1"),
    "database": os.environ.get("DB_NAME", "nathans_organization"),
}


def get_connection():
    return mysql.connector.connect(**DB_CONFIG)


# ---------- Pages and static files ----------

@app.route("/")
def home():
    return send_from_directory(BASE_DIR, "index.html")


@app.route("/<page>.html")
def page(page):
    if page not in PAGES:
        abort(404)
    return send_from_directory(BASE_DIR, f"{page}.html")


@app.route("/index.css")
def css():
    return send_from_directory(BASE_DIR, "index.css")


@app.route("/tasks.js")
def tasks_js():
    return send_from_directory(BASE_DIR, "tasks.js")


@app.route("/images/<path:filename>")
def images(filename):
    return send_from_directory(os.path.join(BASE_DIR, "images"), filename)


# ---------- Task API ----------

@app.route("/api/tasks", methods=["GET"])
def list_tasks():
    conn = get_connection()
    try:
        cur = conn.cursor(dictionary=True)
        cur.execute("SELECT id, title, is_done FROM tasks ORDER BY created_at, id")
        rows = cur.fetchall()
        for row in rows:
            row["is_done"] = bool(row["is_done"])
        return jsonify(rows)
    finally:
        conn.close()


@app.route("/api/tasks", methods=["POST"])
def add_task():
    data = request.get_json(silent=True) or {}
    title = (data.get("title") or "").strip()
    if not title:
        return jsonify({"error": "Task title is required."}), 400
    if len(title) > 255:
        return jsonify({"error": "Task title must be 255 characters or fewer."}), 400

    conn = get_connection()
    try:
        cur = conn.cursor()
        cur.execute("INSERT INTO tasks (title) VALUES (%s)", (title,))
        conn.commit()
        return jsonify({"id": cur.lastrowid, "title": title, "is_done": False}), 201
    finally:
        conn.close()


@app.route("/api/tasks/<int:task_id>", methods=["PATCH"])
def update_task(task_id):
    data = request.get_json(silent=True) or {}
    if "is_done" not in data:
        return jsonify({"error": "is_done is required."}), 400

    conn = get_connection()
    try:
        cur = conn.cursor()
        cur.execute(
            "UPDATE tasks SET is_done = %s WHERE id = %s",
            (bool(data["is_done"]), task_id),
        )
        conn.commit()
        return jsonify({"id": task_id, "is_done": bool(data["is_done"])})
    finally:
        conn.close()


if __name__ == "__main__":
    app.run(debug=True)
-- Run this once in the Netlify DB SQL console (or your NetlifyDB.session.sql).
CREATE TABLE IF NOT EXISTS tasks (
  id         SERIAL PRIMARY KEY,
  title      VARCHAR(255) NOT NULL,
  is_done    BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS events (
  id         SERIAL PRIMARY KEY,
  title      VARCHAR(255) NOT NULL,
  event_date DATE NOT NULL,
  event_time TIME
);

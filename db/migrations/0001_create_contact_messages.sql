-- Migration 0001: Tạo bảng contact_messages cho Contact API (Cloudflare D1 / SQLite)
-- Tham chiếu: docs/03-architecture-proposal.md §5, docs/05-technical-decisions.md (ADR-007, ADR-012)
-- Chính sách bảo mật: không lưu IP gốc (chỉ lưu SHA-256 hex kèm salt ở ip_hash).

CREATE TABLE IF NOT EXISTS contact_messages (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  name        TEXT NOT NULL CHECK (length(trim(name)) >= 1 AND length(name) <= 100),
  email       TEXT NOT NULL CHECK (length(email) BETWEEN 3 AND 254 AND instr(email, '@') > 1),
  subject     TEXT CHECK (subject IS NULL OR (length(trim(subject)) >= 1 AND length(subject) <= 150)),
  message     TEXT NOT NULL CHECK (length(trim(message)) >= 10 AND length(message) <= 5000),
  locale      TEXT NOT NULL CHECK (locale IN ('en', 'vi')),
  ip_hash     TEXT CHECK (ip_hash IS NULL OR length(ip_hash) = 64),
  user_agent  TEXT CHECK (user_agent IS NULL OR length(user_agent) <= 512),
  status      TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'read', 'archived', 'spam')),
  created_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE INDEX IF NOT EXISTS idx_contact_messages_created_at
  ON contact_messages (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_contact_messages_status
  ON contact_messages (status);

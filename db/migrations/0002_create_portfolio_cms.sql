-- Bảng lưu nội dung Portfolio song ngữ (VI / EN)
CREATE TABLE IF NOT EXISTS portfolio_contents (
  locale TEXT PRIMARY KEY CHECK (locale IN ('vi', 'en')),
  content_json TEXT NOT NULL,
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_by TEXT
);

-- Bảng lưu metadata ảnh đại diện và file CV trên Cloudflare R2
CREATE TABLE IF NOT EXISTS media_assets (
  asset_type TEXT PRIMARY KEY CHECK (asset_type IN ('avatar', 'cv')),
  r2_key TEXT NOT NULL,
  original_name TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  size_bytes INTEGER NOT NULL,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
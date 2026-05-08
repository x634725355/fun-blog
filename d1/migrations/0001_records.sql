-- 移动端记录时间线：D1 表 records（见 docs/mobile-record-timeline.md）

CREATE TABLE IF NOT EXISTS records (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  kind TEXT NOT NULL CHECK (kind IN ('text', 'file')),
  body TEXT,
  r2_key TEXT,
  mime TEXT,
  original_name TEXT,
  created_at INTEGER NOT NULL,
  CHECK (
    (kind = 'text' AND body IS NOT NULL AND r2_key IS NULL)
    OR (kind = 'file' AND r2_key IS NOT NULL)
  )
);

CREATE INDEX IF NOT EXISTS idx_records_created_id ON records (created_at, id);

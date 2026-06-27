
ALTER TABLE t_p95474364_new_vision_project_4.titles
  ADD COLUMN IF NOT EXISTS reviews JSONB DEFAULT '[]';

CREATE TABLE t_p95474364_new_vision_project_4.watch_status (
  id SERIAL PRIMARY KEY,
  session_id VARCHAR(64) NOT NULL,
  title_id INTEGER NOT NULL,
  status VARCHAR(20) NOT NULL CHECK (status IN ('watching', 'watched', 'planned', 'dropped')),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (session_id, title_id)
);

CREATE TABLE t_p95474364_new_vision_project_4.episode_progress (
  id SERIAL PRIMARY KEY,
  session_id VARCHAR(64) NOT NULL,
  title_id INTEGER NOT NULL,
  season INTEGER NOT NULL DEFAULT 1,
  episode INTEGER NOT NULL,
  watched BOOLEAN DEFAULT TRUE,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (session_id, title_id, season, episode)
);

CREATE TABLE t_p95474364_new_vision_project_4.favorites (
  id SERIAL PRIMARY KEY,
  session_id VARCHAR(64) NOT NULL,
  title_id INTEGER NOT NULL,
  added_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (session_id, title_id)
);

CREATE INDEX IF NOT EXISTS idx_watch_status_session ON t_p95474364_new_vision_project_4.watch_status(session_id);
CREATE INDEX IF NOT EXISTS idx_ep_progress_session ON t_p95474364_new_vision_project_4.episode_progress(session_id, title_id);
CREATE INDEX IF NOT EXISTS idx_favorites_session ON t_p95474364_new_vision_project_4.favorites(session_id);

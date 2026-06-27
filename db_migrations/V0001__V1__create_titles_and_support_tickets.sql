
CREATE TABLE t_p95474364_new_vision_project_4.titles (
  id SERIAL PRIMARY KEY,
  tmdb_id INTEGER UNIQUE,
  type VARCHAR(10) NOT NULL CHECK (type IN ('movie', 'series')),
  title VARCHAR(500) NOT NULL,
  original_title VARCHAR(500),
  year INTEGER,
  description TEXT,
  poster_url TEXT,
  backdrop_url TEXT,
  genres TEXT[],
  cast_members JSONB DEFAULT '[]',
  crew JSONB DEFAULT '[]',
  episodes JSONB DEFAULT '[]',
  rating NUMERIC(3,1),
  runtime INTEGER,
  status VARCHAR(50),
  seasons_count INTEGER,
  episodes_count INTEGER,
  release_date DATE,
  added_manually BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE t_p95474364_new_vision_project_4.support_tickets (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL,
  subject VARCHAR(500) NOT NULL,
  message TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

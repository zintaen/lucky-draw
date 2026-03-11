-- ============================================================
-- Session-based Lucky Draw — Migration
-- Run this in your Supabase SQL Editor AFTER schema.sql
-- ============================================================

-- 1. Create the sessions table
CREATE TABLE IF NOT EXISTS sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL DEFAULT 'Lucky Draw',
  total_numbers INTEGER NOT NULL DEFAULT 25,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  active BOOLEAN NOT NULL DEFAULT true
);

-- 2. Add event_session_id to draws (FK → sessions)
ALTER TABLE draws
  ADD COLUMN IF NOT EXISTS event_session_id UUID REFERENCES sessions(id) ON DELETE CASCADE;

-- 3. Rename old session_id → browser_session_id (stores browser tab id)
ALTER TABLE draws RENAME COLUMN session_id TO browser_session_id;

-- 4. Drop the UNIQUE constraint on number so multiple sessions can share numbers
ALTER TABLE draws DROP CONSTRAINT IF EXISTS draws_number_key;

-- 5. Add a composite unique so each (session, number) pair is unique
ALTER TABLE draws
  ADD CONSTRAINT draws_session_number_unique UNIQUE (event_session_id, number);

-- 6. RLS for sessions
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow anonymous read sessions" ON sessions
  FOR SELECT USING (true);

CREATE POLICY "Allow anonymous insert sessions" ON sessions
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow anonymous update sessions" ON sessions
  FOR UPDATE USING (true);

-- 7. create_session RPC — creates a session + seeds its draw numbers
CREATE OR REPLACE FUNCTION create_session(p_name TEXT, p_total_numbers INTEGER)
RETURNS UUID AS $$
DECLARE
  v_session_id UUID;
BEGIN
  INSERT INTO sessions (name, total_numbers)
  VALUES (p_name, p_total_numbers)
  RETURNING id INTO v_session_id;

  INSERT INTO draws (number, event_session_id)
  SELECT g, v_session_id
  FROM generate_series(1, p_total_numbers) AS g;

  RETURN v_session_id;
END;
$$ LANGUAGE plpgsql;

-- 8. Updated draw_number — now scoped to a session
CREATE OR REPLACE FUNCTION draw_number(p_session_id TEXT, p_event_session_id UUID DEFAULT NULL)
RETURNS INTEGER AS $$
DECLARE
  v_number INTEGER;
BEGIN
  SELECT number INTO v_number
  FROM draws
  WHERE drawn = false
    AND (p_event_session_id IS NULL OR event_session_id = p_event_session_id)
  ORDER BY random()
  LIMIT 1
  FOR UPDATE SKIP LOCKED;

  IF v_number IS NULL THEN
    RETURN NULL;
  END IF;

  UPDATE draws
  SET drawn = true,
      drawn_at = now(),
      browser_session_id = p_session_id
  WHERE number = v_number
    AND (p_event_session_id IS NULL OR event_session_id = p_event_session_id);

  RETURN v_number;
END;
$$ LANGUAGE plpgsql;

-- 9. Updated reset_draws — scoped to a session
CREATE OR REPLACE FUNCTION reset_draws(p_event_session_id UUID DEFAULT NULL)
RETURNS VOID AS $$
BEGIN
  UPDATE draws
  SET drawn = false, drawn_at = NULL, browser_session_id = NULL
  WHERE (p_event_session_id IS NULL OR event_session_id = p_event_session_id);
END;
$$ LANGUAGE plpgsql;

-- 10. Enable realtime for sessions table
ALTER PUBLICATION supabase_realtime ADD TABLE sessions;

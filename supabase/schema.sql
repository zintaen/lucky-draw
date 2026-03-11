-- ============================================================
-- Lucky Draw Schema & RPC Function
-- Run this in your Supabase SQL Editor
-- ============================================================

-- 1. Create the draws table
CREATE TABLE IF NOT EXISTS draws (
  id SERIAL PRIMARY KEY,
  number INTEGER NOT NULL UNIQUE,
  drawn BOOLEAN NOT NULL DEFAULT false,
  drawn_at TIMESTAMPTZ,
  session_id TEXT
);

-- 2. Seed numbers 1 through 25 (adjust the range as needed)
INSERT INTO draws (number)
SELECT generate_series(1, 25)
ON CONFLICT (number) DO NOTHING;

-- 3. Enable Row Level Security but allow anonymous read/write
ALTER TABLE draws ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow anonymous read" ON draws
  FOR SELECT USING (true);

CREATE POLICY "Allow anonymous update" ON draws
  FOR UPDATE USING (true);

CREATE POLICY "Allow anonymous insert" ON draws
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow anonymous delete" ON draws
  FOR DELETE USING (true);

-- 4. Atomic draw function — prevents race conditions
CREATE OR REPLACE FUNCTION draw_number(p_session_id TEXT)
RETURNS INTEGER AS $$
DECLARE
  v_number INTEGER;
BEGIN
  SELECT number INTO v_number
  FROM draws
  WHERE drawn = false
  ORDER BY random()
  LIMIT 1
  FOR UPDATE SKIP LOCKED;

  IF v_number IS NULL THEN
    RETURN NULL;
  END IF;

  UPDATE draws
  SET drawn = true,
      drawn_at = now(),
      session_id = p_session_id
  WHERE number = v_number;

  RETURN v_number;
END;
$$ LANGUAGE plpgsql;

-- 5. Reset function for admin
CREATE OR REPLACE FUNCTION reset_draws()
RETURNS VOID AS $$
BEGIN
  UPDATE draws SET drawn = false, drawn_at = NULL, session_id = NULL;
END;
$$ LANGUAGE plpgsql;

-- 6. Enable realtime for the draws table
ALTER PUBLICATION supabase_realtime ADD TABLE draws;

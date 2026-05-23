-- ============================================================
-- Migration 003: Achievements + Net Worth tables
-- Run this in your Supabase SQL Editor
-- ============================================================

-- 1. User achievements / badges
CREATE TABLE IF NOT EXISTS user_achievements (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  achievement_id VARCHAR(100) NOT NULL,  -- e.g. 'first_transaction', 'streak_7'
  unlocked_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, achievement_id)
);

ALTER TABLE user_achievements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Achievements: own data only" ON user_achievements
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- 2. Net worth snapshots
CREATE TABLE IF NOT EXISTS net_worth_entries (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  snapshot_date DATE NOT NULL DEFAULT CURRENT_DATE,
  cash        DECIMAL(14,2) NOT NULL DEFAULT 0,
  savings     DECIMAL(14,2) NOT NULL DEFAULT 0,
  investments DECIMAL(14,2) NOT NULL DEFAULT 0,
  debts       DECIMAL(14,2) NOT NULL DEFAULT 0,
  notes       TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, snapshot_date)
);

ALTER TABLE net_worth_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Net worth: own data only" ON net_worth_entries
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

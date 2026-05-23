-- ============================================================
-- Migration 002: Subscriptions flag + Bills table
-- Run this in your Supabase SQL Editor
-- ============================================================

-- 1. Add subscription columns to recurring_transactions
ALTER TABLE recurring_transactions
  ADD COLUMN IF NOT EXISTS is_subscription BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS subscription_service VARCHAR(100);

-- 2. Create bills table
CREATE TABLE IF NOT EXISTS bills (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  space_id      UUID NOT NULL REFERENCES spaces(id) ON DELETE CASCADE,
  created_by    UUID NOT NULL REFERENCES profiles(id),
  name          VARCHAR(200) NOT NULL,
  amount        DECIMAL(12,2) NOT NULL DEFAULT 0,
  category      VARCHAR(100) NOT NULL DEFAULT 'Bills',
  due_date      DATE NOT NULL,
  is_paid       BOOLEAN NOT NULL DEFAULT FALSE,
  paid_at       TIMESTAMPTZ,
  is_recurring  BOOLEAN NOT NULL DEFAULT FALSE,
  frequency     VARCHAR(50),          -- 'monthly' | 'quarterly' | 'annual'
  emoji         VARCHAR(10),
  notes         TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Row-level security
ALTER TABLE bills ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Bills: space member access" ON bills;
CREATE POLICY "Bills: space member access" ON bills
  USING (
    space_id IN (
      SELECT space_id FROM space_members WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    space_id IN (
      SELECT space_id FROM space_members WHERE user_id = auth.uid()
    )
  );

-- 4. Auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS bills_updated_at ON bills;
CREATE TRIGGER bills_updated_at
  BEFORE UPDATE ON bills
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Finance Tracker Database Schema

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS households (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  household_id UUID REFERENCES households(id) ON DELETE SET NULL,
  auth0_sub TEXT UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  vendor TEXT NOT NULL,
  amount NUMERIC(12, 2) NOT NULL,
  category TEXT NOT NULL,
  notes TEXT,
  hidden BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS income (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  source TEXT NOT NULL,
  amount NUMERIC(12, 2) NOT NULL,
  category TEXT NOT NULL,
  notes TEXT,
  hidden BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS budget_targets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  category TEXT NOT NULL,
  monthly_amount NUMERIC(12, 2) NOT NULL,
  UNIQUE (household_id, category)
);

-- Indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_expenses_household_date ON expenses(household_id, date);
CREATE INDEX IF NOT EXISTS idx_expenses_user ON expenses(user_id);
CREATE INDEX IF NOT EXISTS idx_income_household_date ON income(household_id, date);
CREATE INDEX IF NOT EXISTS idx_income_user ON income(user_id);
CREATE INDEX IF NOT EXISTS idx_budget_targets_household ON budget_targets(household_id);

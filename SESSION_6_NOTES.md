# Spendie — Session 6 Notes

## Overview

This session was a **major feature expansion** covering all 13 features on the roadmap across three tiers.
Every feature was built, verified for import correctness, and committed in separate PRs.
Two Supabase SQL migrations were written and must be run before the new tables are available.

---

## Feature Roadmap Completed

### 🟢 Tier 1 — Pure Frontend (no DB changes required)

| Feature | Status |
|---------|--------|
| Monthly Transaction Filter | ✅ Done |
| Timeline Feed | ✅ Done |
| Category Trends | ✅ Done |
| Streak System | ✅ Done |
| Dynamic Themes (8 presets) | ✅ Done |

### 🟡 Tier 2 — Small DB additions

| Feature | Status |
|---------|--------|
| Subscription/Recurring Upgrade | ✅ Done |
| Bills & Due Dates | ✅ Done |

### 🔴 Tier 3 — Complex new features

| Feature | Status |
|---------|--------|
| Calendar View | ✅ Done |
| Cash Flow Forecast | ✅ Done |
| Net Worth Tracker | ✅ Done |
| Achievements / Badges | ✅ Done |

---

## Tier 1 Details

### Monthly Transaction Filter

**What changed:**
- `DashboardScreen` gained `selectedMonth` and `selectedYear` state (defaults to current month)
- `monthTransactions` is a `useMemo` filter of all transactions for the selected month
- `monthSummary` is a `useMemo` computing income/expenses/balance for the selected month only
- `summary` (all-time running balance) is kept separately for the BalanceCard balance display
- All budget alerts, insights, and budget progress bars now use `monthTransactions` (month-scoped)

**Components:**
- `MonthNavigator.jsx` (new) — `< Month Year >` navigation with "This Month" badge
  - `variant` prop: `'light'` (white text, for BalanceCard) or `'dark'` (colored text, for white cards)
- `BalanceCard.jsx` — updated to show:
  - `Running Balance` = all-time net (doesn't change with month)
  - Monthly Income / Expenses / Saved from `monthSummary`
  - `MonthNavigator` embedded at top of card
- `TransactionsSection.jsx` — shows `MonthNavigator` (dark variant) above the list

---

### Timeline Feed

**`TransactionsSection.jsx`** completely rebuilt:
- Transactions grouped by calendar day
- Day headers: "Today", "Yesterday", "Monday May 20", etc.
- Vertical connector lines with colored dots per category
- Daily income + expense totals shown in each day header
- Monthly summary chips (total in, total out, entry count) at top
- Time-of-day shown per transaction

---

### Category Trends

**`CategoryTrends.jsx`** (new component in Analytics tab):
- Compares spending per category: current selected month vs previous month
- Shows ↑↓ = arrows with % change
- "New" badge for categories that appear for the first time
- Sorted by current month spending (highest first)
- Sits below the pie/bar charts in the Analytics tab

---

### Streak System

**`StreakCard.jsx`** (new, shown in Overview tab):
- **Logging Streak** — consecutive days going back from today that have ≥1 transaction
- **No Spend Streak** — consecutive days with zero expense transactions
- **Budget Streak** — days this month where no budget category was exceeded (cumulative)

---

### Dynamic Themes

**Architecture:**
- `src/lib/themes.js` — 8 theme presets, each with the same color key contract
- `src/lib/ThemeContext.jsx` — React Context wrapping the whole app; persists chosen theme to `AsyncStorage`
- `useTheme()` hook returns `{ colors, spacing, radius, typography, shadow, themeId, selectTheme, allThemes, currentTheme }`

**8 presets:**
| ID | Name | Emoji |
|----|------|-------|
| `default` | Violet | 💜 |
| `minimal` | Minimal | ⬜ |
| `pastel` | Pastel | 🌸 |
| `sakura` | Sakura | 🌺 |
| `financeGreen` | Finance | 💹 |
| `amoled` | AMOLED | 🌑 |
| `cyberpunk` | Cyberpunk | ⚡ |
| `retroTerminal` | Terminal | 🖥️ |

**Theme picker UI:**
- Bottom sheet triggered by the theme emoji button in the Header
- Each theme card shows a live color swatch preview (accent bar, 3 color blocks, fake card lines)
- Active theme gets a checkmark badge

**Components updated to use `useTheme()`:**
- `Header.jsx` — background color, theme picker emoji button
- `BottomNavigation.jsx` — background, active/inactive text colors, dot
- `FloatingAddButton.jsx` — background, shadow color
- `BalanceCard.jsx` — gradient uses `theme.gradientStart`/`gradientEnd`
- `App.js` — wrapped in `<ThemeProvider>`

> **Note:** The remaining ~20 components still import colors directly from `theme.js` (the default violet theme). They work correctly with the default theme and will need to be updated in a future session for full theme support.

---

## Tier 2 Details

### Subscription / Recurring Upgrade

**`RecurringModal.jsx`** rebuilt with two tabs:

**Manual tab:**
- "Mark as Subscription" toggle (Switch component)
- Auto-detection: typing a known service name (Netflix, Spotify, etc.) auto-fills emoji, category → "Subscriptions", and marks is_subscription=true
- Detection hint badge appears when a service is detected
- Frequency selector changed to pill buttons (Daily / Weekly / Monthly / Semi-Monthly)

**Quick Subscriptions tab:**
- 15 preset services: Netflix, Spotify, YouTube Premium, Disney+, Amazon Prime, Apple Music, HBO Max, Canva Pro, Adobe CC, Microsoft 365, Google One, iCloud, Gym, Internet, Phone Plan
- Tap a preset → auto-fills description, emoji, category, frequency, is_subscription flag

**`SubscriptionSection.jsx`** (new, Planning tab):
- Filters recurring transactions where `is_subscription=true` OR `category='Subscriptions'`
- Monthly cost total banner (with count)
- Per-subscription renewal date with urgency color:
  - 🔴 Red: overdue
  - 🟠 Orange: within 3 days
  - 🔵 Blue: within 7 days
  - 🟢 Green: more than 7 days out
- Sorted by soonest renewal

**Required Supabase SQL (migration 002):**
```sql
ALTER TABLE recurring_transactions
  ADD COLUMN IF NOT EXISTS is_subscription BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS subscription_service VARCHAR(100);
```

---

### Bills & Due Dates

**`BillsModal.jsx`** (new):
- Horizontal scroll of bill preset chips: Electricity, Water, Internet, Rent, Credit Card, Loan, Insurance, Phone, Gas, Other
- Due date text input (YYYY-MM-DD format)
- Recurring bill toggle → shows frequency picker (monthly/quarterly/annual)
- Notes field (account numbers, references, etc.)

**`BillsSection.jsx`** (new, top of Planning tab):
- Three grouped sections:
  - 🔴 **Overdue** — past due, unpaid
  - 🟠 **Upcoming** — not yet due, unpaid (sorted by soonest)
  - 🟢 **Paid** — marked as paid this cycle
- Summary chips: overdue count, upcoming count, total unpaid amount
- Per-bill actions: ✅ Mark Paid, ✏️ Edit, 🗑️ Delete
- Gracefully hides if bills table doesn't exist yet (error code `42P01`)

**Required Supabase SQL (migration 002):**
```sql
CREATE TABLE IF NOT EXISTS bills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  space_id UUID NOT NULL REFERENCES spaces(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES profiles(id),
  name VARCHAR(200) NOT NULL,
  amount DECIMAL(12,2) NOT NULL DEFAULT 0,
  category VARCHAR(100) NOT NULL DEFAULT 'Bills',
  due_date DATE NOT NULL,
  is_paid BOOLEAN NOT NULL DEFAULT FALSE,
  paid_at TIMESTAMPTZ,
  is_recurring BOOLEAN NOT NULL DEFAULT FALSE,
  frequency VARCHAR(50),
  emoji VARCHAR(10),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE bills ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Bills: space member access" ON bills
  USING (space_id IN (SELECT space_id FROM space_members WHERE user_id = auth.uid()))
  WITH CHECK (space_id IN (SELECT space_id FROM space_members WHERE user_id = auth.uid()));
```

---

## Tier 3 Details

### Calendar View

**`CalendarView.jsx`** (new, top of Analytics tab):
- Full monthly grid with prev/next month navigation
- Color-coded indicator dots per day:
  - 🟢 Green dot = income
  - 🔴 Red dot = expense
  - 🟠 Orange dot = bill due
- Mini ₱ amount labels on days with activity (e.g., "+5.2k / -1.3k")
- Today highlighted with primary color background
- Tapping a day with activity → bottom sheet modal showing:
  - Daily income/expense summary chips
  - Bills due (name, category, amount)
  - Transactions (category, description, amount)

---

### Cash Flow Forecast

**`CashFlowForecast.jsx`** (new, Analytics tab below Calendar):
- Projects balance for **4 months forward** using:
  1. Current all-time running balance as starting point
  2. Average monthly income/expenses from last 3 months of history
  3. Bills due in each projected month
  4. Net monthly amount from all recurring transactions (adjusted for frequency)
- Line chart — green if trending up, red if trending down
- Trend badge: `+₱X,XXX projected (+Y%)`
- Month-by-month breakdown row (Jan / Feb / Mar / Apr)
- Disclaimer text explaining the methodology

---

### Net Worth Tracker

**`NetWorthSection.jsx`** (new, Profile tab):
- "Update" button → bottom sheet modal with 4 fields:
  - 💵 Cash on Hand
  - 🏦 Savings / Bank
  - 📈 Investments
  - 💸 Total Debts / Loans
  - Notes field
- **Live preview**: net worth = cash + savings + investments − debts (updates as you type)
- Stored as daily snapshots in `net_worth_entries` table (upsert by user_id + date)
- Shows last 6 snapshots as a line chart
- Change vs previous snapshot (amount + %)
- Breakdown of latest snapshot: cash / savings / investments / debts

**Required Supabase SQL (migration 003):**
```sql
CREATE TABLE IF NOT EXISTS net_worth_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  snapshot_date DATE NOT NULL DEFAULT CURRENT_DATE,
  cash DECIMAL(14,2) NOT NULL DEFAULT 0,
  savings DECIMAL(14,2) NOT NULL DEFAULT 0,
  investments DECIMAL(14,2) NOT NULL DEFAULT 0,
  debts DECIMAL(14,2) NOT NULL DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, snapshot_date)
);
ALTER TABLE net_worth_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Net worth: own data only" ON net_worth_entries
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
```

---

### Achievements System

**`src/lib/achievementsEngine.js`** (new):
- 18 badge definitions with `id`, `title`, `description`, `emoji`, `category`, and a `check()` function
- `computeUnlockedAchievements()` — pure function, runs against current data snapshot, no DB calls
- Categories: Getting Started, Consistency, Savings, Budgeting, Planning

**18 Badges:**
| Badge | Unlock Condition |
|-------|-----------------|
| 👶 First Step | Log first transaction |
| 🎯 Budget Boss | Create first budget |
| 🌟 Goal Setter | Create first goal |
| 🔥 3-Day Streak | Log 3 consecutive days |
| 💪 Week Warrior | Log 7 consecutive days |
| 👑 Monthly Master | Log 30 consecutive days |
| 📝 Getting Serious | 10 total transactions |
| ⚡ Power Tracker | 50 total transactions |
| 🚫 Frugal Start | 3 no-spend days in a row |
| 🌱 Quarter Way | 25% on any goal |
| 🏆 Goal Crusher | Complete a savings goal |
| 💚 In the Green | Monthly income > expenses |
| 🛡️ Budget Hero | 28 days within all budgets |
| 🏗️ Budget Architect | 5 budget categories |
| 🔁 Automate It | First recurring transaction |
| 🧾 Bill Tracker | First bill added |
| 📦 Subscription Aware | First subscription tracked |

**`AchievementsSection.jsx`** (new, Profile tab):
- Progress bar (X/18 unlocked, %)
- Grouped by category
- Unlocked: colored background + checkmark dot
- Locked: greyed-out emoji, muted text
- Motivational footer message

---

## Navigation Changes

The bottom nav tabs were reorganized:

| Before | After |
|--------|-------|
| 🏠 Home | 🏠 Home |
| 💸 Transactions | 💸 Log |
| 🎯 Planning | 🎯 Plan |
| 📊 Analytics | 📊 Trends |
| 👥 People | 👤 Profile |

**New tab content:**
- **Trends** (formerly Analytics): Calendar View → Cash Flow Forecast → Monthly Trend Chart → Analytics/Charts → Category Trends
- **Profile** (formerly People): Achievements → Net Worth → Spaces → Members → Quick Info

**Floating Add Button behavior:**
- Overview / Transactions → Add Transaction
- Planning → Add Bill (was: Add Goal — goals still accessible via BudgetSection)
- Profile → Add Space

---

## Category System Expanded

`src/lib/categoryConfig.js` now includes 24 categories:

**Income:** Salary, Freelance, Business
**Daily:** Food, Transportation, Shopping, Health, Entertainment, Games
**Bills:** Bills, Rent, Utilities, Internet, Insurance, Loan
**Subscriptions:** Subscriptions (new)
**Financial:** Savings, Investment
**Misc:** Education, Travel, Gifts, Other

New exports:
- `KNOWN_SUBSCRIPTIONS` — 15 service entries with name + emoji for auto-detection
- `BILL_CATEGORIES` — 10 bill presets with label, emoji, and default category

---

## SQL Migrations Required

Run these in your Supabase SQL Editor before deploying:

### `supabase/migrations/002_subscriptions_and_bills.sql`
- Adds `is_subscription` BOOLEAN and `subscription_service` VARCHAR to `recurring_transactions`
- Creates `bills` table with full RLS
- Adds `updated_at` auto-trigger on bills

### `supabase/migrations/003_achievements_networth.sql`
- Creates `user_achievements` table (currently unused — achievements compute client-side)
- Creates `net_worth_entries` table with RLS

---

## File Changes This Session

### New Files
```
src/
├── components/
│   ├── common/
│   │   ├── MonthNavigator.jsx          ← month navigation (light + dark variants)
│   │   └── ThemePicker.jsx             ← 8-theme picker bottom sheet
│   └── dashboard/
│       ├── AchievementsSection.jsx     ← 18-badge achievement display
│       ├── BillsSection.jsx            ← bills + due dates dashboard
│       ├── CalendarView.jsx            ← monthly calendar with day-tap modal
│       ├── CashFlowForecast.jsx        ← 4-month balance projection chart
│       ├── CategoryTrends.jsx          ← month-vs-month category comparison
│       ├── NetWorthSection.jsx         ← net worth tracker + history chart
│       ├── StreakCard.jsx              ← logging / no-spend / budget streaks
│       └── SubscriptionSection.jsx     ← subscription dashboard
│   └── modals/
│       └── BillsModal.jsx              ← bill add/edit modal
├── lib/
│   ├── ThemeContext.jsx                ← React Context + useTheme hook
│   ├── achievementsEngine.js           ← 18 badge definitions + check logic
│   └── themes.js                      ← 8 theme presets
└── supabase/
    └── migrations/
        ├── 002_subscriptions_and_bills.sql
        └── 003_achievements_networth.sql
```

### Modified Files
```
App.js                                  ← wrapped in ThemeProvider
src/lib/constants.js                    ← nav tabs renamed/restructured
src/lib/categoryConfig.js              ← 24 categories + KNOWN_SUBSCRIPTIONS + BILL_CATEGORIES
src/screens/DashboardScreen.jsx         ← month filter, streak memos, achievements, bills, subscriptions, net worth
src/components/common/
  ├── BottomNavigation.jsx              ← useTheme for dynamic colors
  ├── FloatingAddButton.jsx             ← useTheme for dynamic primary color
  └── Header.jsx                       ← useTheme + theme picker button
src/components/dashboard/
  ├── AnalyticsSection.jsx             ← adds CategoryTrends, passes selectedMonth/Year
  ├── BalanceCard.jsx                  ← useTheme gradient, MonthNavigator, monthSummary
  └── TransactionsSection.jsx         ← timeline feed + MonthNavigator (dark)
src/components/modals/
  └── RecurringModal.jsx               ← subscription tabs + auto-detection + presets
```

---

## Architecture Notes

### Month Filter Pattern
All budget/insight calculations are now month-scoped via `monthTransactions`. The running `summary.balance` is still all-time for the balance card number, while `monthSummary` shows what was earned/spent in the selected month.

### Theme Pattern
`useTheme()` is the preferred way to get colors. The `colors` object from `theme.js` still works and reflects the default Violet theme — used by components not yet converted.

### Achievements Pattern
Achievements are computed **client-side on every render** via `useMemo`. No DB round-trips needed. The `user_achievements` table exists for future server-side storage but is not used yet.

### Bills Graceful Degradation
`loadBills()` catches Supabase error code `42P01` (table does not exist) and silently sets `bills: []`. The bills UI still shows but with empty state, prompting the user to run the migration.

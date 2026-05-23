import { toPHDate, getPHNow } from './timezone';

// ── Helpers ───────────────────────────────────────────────────────────────────

function getExpensesInWindow(transactions, days) {
  const phNow  = getPHNow();
  const cutoff = new Date(phNow); cutoff.setDate(cutoff.getDate() - days);
  return transactions.filter((t) => {
    if (t.type !== 'expense') return false;
    const d = toPHDate(t.created_at);
    return d >= cutoff && d <= phNow;
  });
}

/** Number of consecutive days (up to today in PH time) with NO expense */
function noSpendStreak(transactions) {
  const phNow = getPHNow(); phNow.setHours(0, 0, 0, 0);
  const spendDays = new Set(
    transactions
      .filter((t) => t.type === 'expense')
      .map((t) => { const d = toPHDate(t.created_at); d.setHours(0,0,0,0); return d.getTime(); })
  );
  let streak = 0;
  const cursor = new Date(phNow);
  while (!spendDays.has(cursor.getTime())) {
    streak++;
    cursor.setDate(cursor.getDate() - 1);
    if (streak > 365) break;
  }
  return streak;
}

/** Logging streak in consecutive days */
function loggingStreak(transactions) {
  if (!transactions.length) return 0;
  const phNow = getPHNow(); phNow.setHours(0,0,0,0);
  const daySet = new Set(transactions.map((t) => {
    const d = toPHDate(t.created_at); d.setHours(0,0,0,0); return d.getTime();
  }));
  let streak = 0;
  const cursor = new Date(phNow);
  if (!daySet.has(cursor.getTime())) cursor.setDate(cursor.getDate() - 1);
  while (daySet.has(cursor.getTime())) {
    streak++;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

// ── Achievement Definitions ───────────────────────────────────────────────────
export const ACHIEVEMENTS = [
  // ── Getting Started ────────────────────────────────────────────────────────
  {
    id: 'first_transaction',
    title: 'First Step',
    description: 'Log your first transaction',
    emoji: '👶',
    category: 'Getting Started',
    check: ({ transactions }) => transactions.length >= 1,
  },
  {
    id: 'first_budget',
    title: 'Budget Boss',
    description: 'Create your first budget',
    emoji: '🎯',
    category: 'Getting Started',
    check: ({ budgets }) => budgets.length >= 1,
  },
  {
    id: 'first_goal',
    title: 'Goal Setter',
    description: 'Create your first savings goal',
    emoji: '🌟',
    category: 'Getting Started',
    check: ({ goals }) => goals.length >= 1,
  },

  // ── Consistency ────────────────────────────────────────────────────────────
  {
    id: 'streak_3',
    title: '3-Day Streak',
    description: 'Log transactions 3 days in a row',
    emoji: '🔥',
    category: 'Consistency',
    check: ({ transactions }) => loggingStreak(transactions) >= 3,
  },
  {
    id: 'streak_7',
    title: 'Week Warrior',
    description: 'Log transactions 7 days in a row',
    emoji: '💪',
    category: 'Consistency',
    check: ({ transactions }) => loggingStreak(transactions) >= 7,
  },
  {
    id: 'streak_30',
    title: 'Monthly Master',
    description: 'Log transactions 30 days in a row',
    emoji: '👑',
    category: 'Consistency',
    check: ({ transactions }) => loggingStreak(transactions) >= 30,
  },
  {
    id: 'ten_transactions',
    title: 'Getting Serious',
    description: 'Log 10 transactions total',
    emoji: '📝',
    category: 'Consistency',
    check: ({ transactions }) => transactions.length >= 10,
  },
  {
    id: 'fifty_transactions',
    title: 'Power Tracker',
    description: 'Log 50 transactions total',
    emoji: '⚡',
    category: 'Consistency',
    check: ({ transactions }) => transactions.length >= 50,
  },

  // ── Savings ────────────────────────────────────────────────────────────────
  {
    id: 'no_spend_3',
    title: 'Frugal Start',
    description: '3 no-spend days in a row',
    emoji: '🚫',
    category: 'Savings',
    check: ({ transactions }) => noSpendStreak(transactions) >= 3,
  },
  {
    id: 'goal_25',
    title: 'Quarter Way',
    description: 'Reach 25% on a goal',
    emoji: '🌱',
    category: 'Savings',
    check: ({ goals }) => goals.some(g => (Number(g.current_amount) / Number(g.target_amount)) >= 0.25),
  },
  {
    id: 'goal_100',
    title: 'Goal Crusher',
    description: 'Complete a savings goal',
    emoji: '🏆',
    category: 'Savings',
    check: ({ goals }) => goals.some(g => Number(g.current_amount) >= Number(g.target_amount)),
  },
  {
    id: 'positive_month',
    title: 'In the Green',
    description: 'End a month with more income than expenses',
    emoji: '💚',
    category: 'Savings',
    check: ({ monthSummary }) => monthSummary && monthSummary.income > monthSummary.expenses,
  },
  {
    id: 'save_500',
    title: '₱500 Saver',
    description: 'Save ₱500 challenge — accumulate ₱500+ on a savings goal',
    emoji: '💵',
    category: 'Savings',
    check: ({ goals }) => goals.some(g => Number(g.current_amount) >= 500),
  },
  {
    id: 'save_5000',
    title: '₱5,000 Milestone',
    description: 'Save ₱5,000 on a single goal',
    emoji: '💎',
    category: 'Savings',
    check: ({ goals }) => goals.some(g => Number(g.current_amount) >= 5000),
  },

  // ── Budgeting ──────────────────────────────────────────────────────────────
  {
    id: 'budget_on_track',
    title: 'Budget Hero',
    description: 'Stay within all budgets for a month',
    emoji: '🛡️',
    category: 'Budgeting',
    check: ({ budgetStreak }) => budgetStreak >= 28,
  },
  {
    id: 'five_budgets',
    title: 'Budget Architect',
    description: 'Create 5 budget categories',
    emoji: '🏗️',
    category: 'Budgeting',
    check: ({ budgets }) => budgets.length >= 5,
  },

  // ── Planning ───────────────────────────────────────────────────────────────
  {
    id: 'first_recurring',
    title: 'Automate It',
    description: 'Set up your first recurring transaction',
    emoji: '🔁',
    category: 'Planning',
    check: ({ recurringTransactions }) => recurringTransactions.length >= 1,
  },
  {
    id: 'first_bill',
    title: 'Bill Tracker',
    description: 'Add your first bill',
    emoji: '🧾',
    category: 'Planning',
    check: ({ bills }) => bills.length >= 1,
  },
  {
    id: 'first_subscription',
    title: 'Subscription Aware',
    description: 'Track your first subscription',
    emoji: '📦',
    category: 'Planning',
    check: ({ recurringTransactions }) =>
      recurringTransactions.some(r => r.is_subscription || r.category === 'Subscriptions'),
  },

  // ── Challenges ─────────────────────────────────────────────────────────────
  {
    id: 'no_coffee_week',
    title: 'No Coffee Week',
    description: 'Go 7 days without a Food expense under ₱250 during morning hours (5–11am)',
    emoji: '☕',
    category: 'Challenges',
    check: ({ transactions }) => {
      // Proxy: no Food/café expenses ₱50–₱250 logged between 5am–11am for 7 consecutive days
      const phNow = getPHNow(); phNow.setHours(0,0,0,0);
      const coffeeDays = new Set(
        transactions
          .filter((t) => {
            if (t.type !== 'expense') return false;
            const amt = Number(t.amount);
            if (amt < 50 || amt > 250) return false;
            if (!['Food', 'Shopping'].includes(t.category)) return false;
            const h = toPHDate(t.created_at).getHours();
            return h >= 5 && h < 11;
          })
          .map((t) => { const d = toPHDate(t.created_at); d.setHours(0,0,0,0); return d.getTime(); })
      );
      // Check 7 consecutive days with no coffee-range morning purchase
      const cursor = new Date(phNow);
      let clean = 0;
      for (let i = 0; i < 90; i++) {
        if (!coffeeDays.has(cursor.getTime())) {
          clean++;
          if (clean >= 7) return true;
        } else {
          clean = 0;
        }
        cursor.setDate(cursor.getDate() - 1);
      }
      return false;
    },
  },
  {
    id: 'no_impulse_week',
    title: 'No Impulse Week',
    description: '7 days with zero unplanned small purchases (Shopping < ₱500)',
    emoji: '🧘',
    category: 'Challenges',
    check: ({ transactions }) => {
      const phNow = getPHNow(); phNow.setHours(0,0,0,0);
      const impulseDays = new Set(
        transactions
          .filter((t) => t.type === 'expense' && t.category === 'Shopping' && Number(t.amount) < 500)
          .map((t) => { const d = toPHDate(t.created_at); d.setHours(0,0,0,0); return d.getTime(); })
      );
      const cursor = new Date(phNow);
      let clean = 0;
      for (let i = 0; i < 90; i++) {
        if (!impulseDays.has(cursor.getTime())) {
          clean++;
          if (clean >= 7) return true;
        } else {
          clean = 0;
        }
        cursor.setDate(cursor.getDate() - 1);
      }
      return false;
    },
  },
  {
    id: 'no_spend_7',
    title: 'No-Spend Champion',
    description: '7 no-spend days in a row',
    emoji: '🏅',
    category: 'Challenges',
    check: ({ transactions }) => noSpendStreak(transactions) >= 7,
  },
  {
    id: 'budget_week',
    title: 'Week Under Budget',
    description: 'Spend less than ₱500 total in a single week',
    emoji: '🎽',
    category: 'Challenges',
    check: ({ transactions }) => {
      // Check last 12 weeks
      for (let w = 0; w < 12; w++) {
        const phNow  = getPHNow();
        const wEnd   = new Date(phNow); wEnd.setDate(wEnd.getDate() - w * 7); wEnd.setHours(23,59,59,999);
        const wStart = new Date(wEnd);  wStart.setDate(wStart.getDate() - 6); wStart.setHours(0,0,0,0);
        const total  = transactions
          .filter((t) => {
            if (t.type !== 'expense') return false;
            const d = toPHDate(t.created_at);
            return d >= wStart && d <= wEnd;
          })
          .reduce((s, t) => s + Number(t.amount), 0);
        if (total > 0 && total < 500) return true;
      }
      return false;
    },
  },

  // ── Mystery Rewards ────────────────────────────────────────────────────────
  // These show as locked "???" until earned — reveal on unlock
  {
    id: 'mystery_night_owl',
    title: '???',
    description: 'Log a transaction after midnight (PH time)',
    emoji: '🌙',
    category: 'Mystery',
    mystery: true,
    revealTitle: 'Night Owl',
    revealDescription: 'You logged a transaction after midnight. Living that hustle life!',
    check: ({ transactions }) =>
      transactions.some((t) => {
        const h = toPHDate(t.created_at).getHours();
        return h >= 0 && h < 4;
      }),
  },
  {
    id: 'mystery_early_bird',
    title: '???',
    description: 'Log a transaction before 7am (PH time)',
    emoji: '🐦',
    category: 'Mystery',
    mystery: true,
    revealTitle: 'Early Bird',
    revealDescription: 'You tracked your money before 7am. Rise and grind!',
    check: ({ transactions }) =>
      transactions.some((t) => {
        const h = toPHDate(t.created_at).getHours();
        return h >= 4 && h < 7;
      }),
  },
  {
    id: 'mystery_hundred_club',
    title: '???',
    description: 'Hidden challenge',
    emoji: '💯',
    category: 'Mystery',
    mystery: true,
    revealTitle: '100 Club',
    revealDescription: 'You\'ve logged 100 transactions! Absolute dedication to your finances.',
    check: ({ transactions }) => transactions.length >= 100,
  },
  {
    id: 'mystery_triple_income',
    title: '???',
    description: 'Hidden challenge',
    emoji: '🚀',
    category: 'Mystery',
    mystery: true,
    revealTitle: 'Income Tripler',
    revealDescription: 'You logged income 3 times in a single month — multiple income streams! Boss move.',
    check: ({ transactions }) => {
      const phNow = getPHNow();
      const currentMonth = phNow.getMonth();
      const currentYear  = phNow.getFullYear();
      const monthIncome  = transactions.filter((t) => {
        if (t.type !== 'income') return false;
        const d = toPHDate(t.created_at);
        return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
      });
      return monthIncome.length >= 3;
    },
  },
  {
    id: 'mystery_clean_month',
    title: '???',
    description: 'Hidden challenge',
    emoji: '✨',
    category: 'Mystery',
    mystery: true,
    revealTitle: 'Perfect Month',
    revealDescription: 'You logged at least one transaction every single day this month. Flawless tracking!',
    check: ({ transactions }) => {
      const phNow = getPHNow();
      const daysInMonth = phNow.getDate(); // days elapsed so far
      if (daysInMonth < 7) return false;
      const m = phNow.getMonth();
      const y = phNow.getFullYear();
      const daySet = new Set(
        transactions
          .filter((t) => {
            const d = toPHDate(t.created_at);
            return d.getMonth() === m && d.getFullYear() === y;
          })
          .map((t) => toPHDate(t.created_at).getDate())
      );
      for (let d = 1; d <= daysInMonth; d++) {
        if (!daySet.has(d)) return false;
      }
      return true;
    },
  },
];

// ── Compute which achievements have been earned ───────────────────────────────
export function computeUnlockedAchievements({
  transactions = [],
  budgets = [],
  goals = [],
  bills = [],
  recurringTransactions = [],
  loggingStreak: _ls = 0,   // kept for compat but computed internally now
  noSpendStreak: _ns = 0,
  budgetStreak = 0,
  monthSummary = null,
}) {
  return ACHIEVEMENTS.filter((a) =>
    a.check({ transactions, budgets, goals, bills, recurringTransactions, budgetStreak, monthSummary })
  ).map((a) => a.id);
}

/**
 * Spendie Community Challenges
 *
 * Each challenge is self-contained with:
 *   - Progress calculation from transaction data
 *   - Clear success/failure criteria
 *   - Reward badge
 *   - Difficulty rating
 */

import { toPHDate, getPHNow } from './timezone';

// ── Challenge Definitions ─────────────────────────────────────────────────────

export const CHALLENGES = [
  {
    id: 'no_spend_week',
    emoji: '🚫',
    title: 'No Spend Week',
    description: 'Go 7 consecutive days without any discretionary spending (food delivery, shopping, entertainment).',
    category: 'discipline',
    difficulty: 'Hard',
    difficultyColor: '#ef4444',
    duration: 7, // days
    reward: 'Iron Will',
    rewardEmoji: '🏆',
    unit: 'days',
    targetLabel: '7 no-spend days',
    tip: 'Prep meals ahead. Use what you already own. Rediscover free entertainment.',
  },
  {
    id: 'save_500',
    emoji: '💰',
    title: '₱500 Saver Sprint',
    description: 'Save an extra ₱500 this month by tracking and reducing expenses.',
    category: 'savings',
    difficulty: 'Easy',
    difficultyColor: '#22c55e',
    duration: 30,
    reward: 'First Saver',
    rewardEmoji: '💎',
    unit: '₱',
    targetLabel: '₱500 saved',
    tip: 'Cut one category by ₱500 this month. Log everything to track progress.',
  },
  {
    id: 'coffee_free_week',
    emoji: '☕',
    title: 'Coffee-Free Week',
    description: 'Skip bought coffee for 7 days. Brew at home or skip it entirely.',
    category: 'lifestyle',
    difficulty: 'Medium',
    difficultyColor: '#f59e0b',
    duration: 7,
    reward: 'Brew Master',
    rewardEmoji: '⚗️',
    unit: 'days',
    targetLabel: '7 days, no café',
    tip: 'Invest in home brew tools once and save thousands over months.',
  },
  {
    id: 'log_every_day',
    emoji: '📝',
    title: '7-Day Logging Streak',
    description: 'Log at least one transaction every day for 7 consecutive days.',
    category: 'habits',
    difficulty: 'Easy',
    difficultyColor: '#22c55e',
    duration: 7,
    reward: 'Habit Builder',
    rewardEmoji: '📊',
    unit: 'days',
    targetLabel: '7 days logged',
    tip: 'Set a daily alarm at 9PM as your "money check-in" reminder.',
  },
  {
    id: 'budget_all_month',
    emoji: '🎯',
    title: 'Full Month In-Budget',
    description: 'Stay within ALL your budget categories for an entire month.',
    category: 'discipline',
    difficulty: 'Hard',
    difficultyColor: '#ef4444',
    duration: 30,
    reward: 'Budget Master',
    rewardEmoji: '👑',
    unit: 'days',
    targetLabel: 'All budgets respected',
    tip: 'Check your budget progress every 3 days. Catch overruns early.',
  },
  {
    id: 'emergency_fund_start',
    emoji: '🛡️',
    title: 'Emergency Fund Sprint',
    description: 'Save ₱1,000 toward your emergency fund this month.',
    category: 'savings',
    difficulty: 'Medium',
    difficultyColor: '#f59e0b',
    duration: 30,
    reward: 'Safety Net',
    rewardEmoji: '🛡️',
    unit: '₱',
    targetLabel: '₱1,000 saved',
    tip: 'Automate: move ₱250/week into savings the moment income arrives.',
  },
  {
    id: 'no_delivery_week',
    emoji: '🍱',
    title: 'Cook It Week',
    description: 'No food delivery for 7 days. Cook or eat in only.',
    category: 'lifestyle',
    difficulty: 'Medium',
    difficultyColor: '#f59e0b',
    duration: 7,
    reward: 'Home Chef',
    rewardEmoji: '🍳',
    unit: 'days',
    targetLabel: '7 days, no delivery',
    tip: 'Batch cook on Sunday — it removes the temptation to order when tired.',
  },
  {
    id: 'no_shopping_month',
    emoji: '🛍️',
    title: 'No Shopping Month',
    description: 'Zero shopping purchases (non-essential) for 30 days.',
    category: 'discipline',
    difficulty: 'Expert',
    difficultyColor: '#7c3aed',
    duration: 30,
    reward: 'Shopping Detox',
    rewardEmoji: '🌿',
    unit: 'days',
    targetLabel: '30 days, no shopping',
    tip: 'Uninstall shopping apps. Unsubscribe from promo emails. Out of sight, out of cart.',
  },
];

export const CHALLENGE_CATEGORIES = {
  discipline: { label: 'Discipline', color: '#ef4444', emoji: '⚔️' },
  savings: { label: 'Savings', color: '#22c55e', emoji: '💰' },
  lifestyle: { label: 'Lifestyle', color: '#f59e0b', emoji: '🌿' },
  habits: { label: 'Habits', color: '#3b82f6', emoji: '📊' },
};

// ── Progress Calculators ──────────────────────────────────────────────────────

/**
 * Calculate progress for a joined challenge.
 *
 * @param {object} challenge    - challenge definition
 * @param {string} joinedAt     - ISO date when challenge was joined
 * @param {Array}  transactions - all transactions
 * @param {Array}  budgets      - budget objects
 * @returns {{ progress, target, pct, completed, label, daysLeft }}
 */
export function computeChallengeProgress(challenge, joinedAt, transactions, budgets = []) {
  const joinDate = new Date(joinedAt);
  const now = getPHNow();
  const endDate = new Date(joinDate);
  endDate.setDate(endDate.getDate() + challenge.duration);

  const daysLeft = Math.max(0, Math.ceil((endDate - now) / 86400000));
  const isExpired = now > endDate;

  // Transactions within the challenge window
  const windowTx = transactions.filter((t) => {
    const d = toPHDate(t.created_at);
    return d >= joinDate && d <= (isExpired ? endDate : now);
  });

  switch (challenge.id) {
    case 'no_spend_week': {
      // Count days with ZERO expenses in the window
      const expenseDays = new Set(
        windowTx
          .filter((t) => t.type === 'expense' && isDiscretionary(t.category))
          .map((t) => toPHDate(t.created_at).toDateString())
      );
      const totalDays = Math.ceil((Math.min(now, endDate) - joinDate) / 86400000);
      const noSpendDays = Math.max(0, totalDays - expenseDays.size);
      return {
        progress: noSpendDays,
        target: 7,
        pct: Math.min(100, (noSpendDays / 7) * 100),
        completed: noSpendDays >= 7,
        label: `${noSpendDays} / 7 no-spend days`,
        daysLeft,
        isExpired,
      };
    }

    case 'save_500': {
      const income = windowTx.filter((t) => t.type === 'income').reduce((s, t) => s + Number(t.amount), 0);
      const expenses = windowTx.filter((t) => t.type === 'expense').reduce((s, t) => s + Number(t.amount), 0);
      const saved = Math.max(0, income - expenses);
      return {
        progress: saved,
        target: 500,
        pct: Math.min(100, (saved / 500) * 100),
        completed: saved >= 500,
        label: `₱${saved.toFixed(0)} / ₱500 saved`,
        daysLeft,
        isExpired,
      };
    }

    case 'coffee_free_week': {
      const coffeeCategories = ['Food', 'Lifestyle'];
      const coffeeKeywords = ['coffee', 'café', 'cafe', 'starbucks', 'tim hortons', 'latte', 'espresso', 'brew'];
      const coffeeExpDays = new Set(
        windowTx
          .filter((t) => {
            const desc = (t.description || '').toLowerCase();
            return t.type === 'expense' &&
              coffeeCategories.includes(t.category) &&
              coffeeKeywords.some((kw) => desc.includes(kw));
          })
          .map((t) => toPHDate(t.created_at).toDateString())
      );
      const totalDays = Math.ceil((Math.min(now, endDate) - joinDate) / 86400000);
      const cleanDays = Math.max(0, totalDays - coffeeExpDays.size);
      return {
        progress: cleanDays,
        target: 7,
        pct: Math.min(100, (cleanDays / 7) * 100),
        completed: coffeeExpDays.size === 0 && totalDays >= 7,
        label: `${cleanDays} / 7 coffee-free days`,
        daysLeft,
        isExpired,
      };
    }

    case 'log_every_day': {
      const loggedDays = new Set(windowTx.map((t) => toPHDate(t.created_at).toDateString())).size;
      return {
        progress: loggedDays,
        target: 7,
        pct: Math.min(100, (loggedDays / 7) * 100),
        completed: loggedDays >= 7,
        label: `${loggedDays} / 7 days logged`,
        daysLeft,
        isExpired,
      };
    }

    case 'budget_all_month': {
      const overBudget = budgets.some((b) => {
        const spent = windowTx
          .filter((t) => t.type === 'expense' && t.category === b.category)
          .reduce((s, t) => s + Number(t.amount), 0);
        return spent > Number(b.monthly_limit);
      });
      const daysPassed = Math.ceil((Math.min(now, endDate) - joinDate) / 86400000);
      const progress = overBudget ? 0 : daysPassed;
      return {
        progress,
        target: 30,
        pct: overBudget ? 0 : Math.min(100, (daysPassed / 30) * 100),
        completed: !overBudget && daysPassed >= 30,
        label: overBudget ? 'Budget exceeded — reset!' : `${daysPassed} / 30 days clean`,
        daysLeft,
        isExpired,
      };
    }

    case 'emergency_fund_start': {
      const income = windowTx.filter((t) => t.type === 'income').reduce((s, t) => s + Number(t.amount), 0);
      const expenses = windowTx.filter((t) => t.type === 'expense').reduce((s, t) => s + Number(t.amount), 0);
      const saved = Math.max(0, income - expenses);
      return {
        progress: saved,
        target: 1000,
        pct: Math.min(100, (saved / 1000) * 100),
        completed: saved >= 1000,
        label: `₱${saved.toFixed(0)} / ₱1,000 saved`,
        daysLeft,
        isExpired,
      };
    }

    case 'no_delivery_week': {
      const deliveryKeywords = ['grab', 'foodpanda', 'delivery', 'grabfood', 'lalamove'];
      const deliveryDays = new Set(
        windowTx
          .filter((t) => {
            const desc = (t.description || '').toLowerCase();
            return t.type === 'expense' &&
              t.category === 'Food' &&
              deliveryKeywords.some((kw) => desc.includes(kw));
          })
          .map((t) => toPHDate(t.created_at).toDateString())
      );
      const totalDays = Math.ceil((Math.min(now, endDate) - joinDate) / 86400000);
      const cleanDays = Math.max(0, totalDays - deliveryDays.size);
      return {
        progress: cleanDays,
        target: 7,
        pct: Math.min(100, (cleanDays / 7) * 100),
        completed: deliveryDays.size === 0 && totalDays >= 7,
        label: `${cleanDays} / 7 delivery-free days`,
        daysLeft,
        isExpired,
      };
    }

    case 'no_shopping_month': {
      const shoppingDays = new Set(
        windowTx
          .filter((t) => t.type === 'expense' && t.category === 'Shopping')
          .map((t) => toPHDate(t.created_at).toDateString())
      );
      const totalDays = Math.ceil((Math.min(now, endDate) - joinDate) / 86400000);
      const cleanDays = Math.max(0, totalDays - shoppingDays.size);
      return {
        progress: cleanDays,
        target: 30,
        pct: Math.min(100, (cleanDays / 30) * 100),
        completed: shoppingDays.size === 0 && totalDays >= 30,
        label: `${cleanDays} / 30 shopping-free days`,
        daysLeft,
        isExpired,
      };
    }

    default:
      return { progress: 0, target: 1, pct: 0, completed: false, label: 'Tracking...', daysLeft, isExpired };
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const DISCRETIONARY_CATS = ['Food', 'Shopping', 'Entertainment', 'Lifestyle', 'Games', 'Subscriptions'];

function isDiscretionary(category) {
  return DISCRETIONARY_CATS.includes(category);
}

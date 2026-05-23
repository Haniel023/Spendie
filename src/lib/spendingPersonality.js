/**
 * Spending Personality Engine
 *
 * Analyses the user's transaction patterns and assigns a personality
 * type that reflects how they relate to money.
 */

import { toPHDate, getPHNow } from './timezone';

export const PERSONALITIES = {
  impulsive: {
    id: 'impulsive',
    name: 'Impulsive Spender',
    emoji: '🧨',
    color: '#ef4444',
    colorLight: '#fee2e2',
    tagline: 'You live in the moment!',
    description:
      'You tend to make spontaneous purchases without much planning. While enjoying the present is great, a little budget cushion could prevent money stress later.',
    tips: [
      'Try the 24-hour rule: wait a day before any non-essential purchase.',
      'Set a monthly "fun money" limit so impulse buys don\'t wreck your budget.',
      'Track your "oops" purchases — awareness is the first step!',
    ],
  },
  planner: {
    id: 'planner',
    name: 'Planner',
    emoji: '📋',
    color: '#3b82f6',
    colorLight: '#dbeafe',
    tagline: 'You\'ve got it all figured out!',
    description:
      'You think before you spend. You likely have budgets, goals, and a clear picture of where your money goes. You\'re on the right track!',
    tips: [
      'Consider investing surplus savings — budgets alone won\'t build wealth.',
      'Automate your savings so it happens before you can spend it.',
      'Review your plan monthly and celebrate small wins.',
    ],
  },
  saver: {
    id: 'saver',
    name: 'Super Saver',
    emoji: '🐷',
    color: '#22c55e',
    colorLight: '#dcfce7',
    tagline: 'Your future self loves you!',
    description:
      'You prioritize saving over spending. You\'re building a strong financial foundation that will pay off in the long run.',
    tips: [
      'Make sure you\'re also enjoying life — financial health includes joy!',
      'Look into high-yield savings or investments to grow your stash.',
      'Treat yourself occasionally — you\'ve earned it.',
    ],
  },
  minimalist: {
    id: 'minimalist',
    name: 'Minimalist',
    emoji: '🌿',
    color: '#059669',
    colorLight: '#d1fae5',
    tagline: 'Less is more!',
    description:
      'You keep expenses lean and intentional. You don\'t buy what you don\'t need — and your wallet shows it.',
    tips: [
      'Consider channeling your savings surplus into experiences, not things.',
      'A small emergency fund goes a long way — even minimalists face surprises.',
      'Share your mindset — it\'s contagious in a great way!',
    ],
  },
  comfort: {
    id: 'comfort',
    name: 'Comfort Spender',
    emoji: '☕',
    color: '#f59e0b',
    colorLight: '#fef3c7',
    tagline: 'You treat yourself (a lot)!',
    description:
      'You spend on things that bring comfort and enjoyment — food, lifestyle, and little indulgences. Balance is key here.',
    tips: [
      'Find your highest-comfort, lowest-cost substitutes.',
      'Set a "comfort budget" so you can enjoy without guilt.',
      'Ask: "Is this comfort spending aligned with my bigger goals?"',
    ],
  },
  social: {
    id: 'social',
    name: 'Social Spender',
    emoji: '🎉',
    color: '#8b5cf6',
    colorLight: '#ede9fe',
    tagline: 'You love to share the joy!',
    description:
      'You spend on experiences, events, and others. Social spending can be fulfilling, but it can also creep up quickly.',
    tips: [
      'Budget a "going-out" category each month so social life doesn\'t bust your budget.',
      'Host at home sometimes — it\'s often just as fun and way cheaper.',
      'It\'s OK to say no to expensive plans — real friends understand.',
    ],
  },
  anxious: {
    id: 'anxious',
    name: 'Anxious Spender',
    emoji: '😰',
    color: '#6b7280',
    colorLight: '#f3f4f6',
    tagline: 'Money stress is real — you\'re not alone.',
    description:
      'Your spending shows signs of financial stress. You may be spending reactively or struggling to stay within your means.',
    tips: [
      'Start with a simple budget — even ₱500 saved is a win.',
      'Talk to someone: a family member, or a free financial counselor.',
      'One step at a time. Small wins add up.',
    ],
  },
};

// ── Analysis ──────────────────────────────────────────────────────────────────

export function computeSpendingPersonality({ transactions = [], budgets = [], goals = [] }) {
  const phNow = getPHNow();
  const cutoff = new Date(phNow); cutoff.setDate(cutoff.getDate() - 90);

  const recent = transactions.filter((t) => {
    const d = toPHDate(t.created_at);
    return d >= cutoff;
  });

  const expenses  = recent.filter((t) => t.type === 'expense');
  const income    = recent.filter((t) => t.type === 'income');
  const totalExp  = expenses.reduce((s, t) => s + Number(t.amount), 0);
  const totalInc  = income.reduce((s, t) => s + Number(t.amount), 0);

  if (expenses.length < 5) return null; // not enough data

  // ── Signals ───────────────────────────────────────────────────────────────
  // 1. Impulsive: high variety of categories, small avg amount, many transactions
  const uniqueCats    = new Set(expenses.map((t) => t.category)).size;
  const avgAmount     = totalExp / expenses.length;
  const txPerDay      = expenses.length / 90;
  const impulsiveScore = (uniqueCats > 4 ? 1 : 0) + (txPerDay > 1.5 ? 1 : 0) + (avgAmount < 200 ? 1 : 0);

  // 2. Planner: has budgets AND goals, spending < 90% of income
  const hasBudgets      = budgets.length >= 2;
  const hasGoals        = goals.length >= 1;
  const spendingRatio   = totalInc > 0 ? totalExp / totalInc : 1;
  const plannerScore    = (hasBudgets ? 2 : 0) + (hasGoals ? 1 : 0) + (spendingRatio < 0.9 ? 1 : 0);

  // 3. Saver: spending ratio < 60%, has goals
  const saverScore = (spendingRatio < 0.6 ? 3 : spendingRatio < 0.75 ? 1 : 0) + (hasGoals ? 1 : 0);

  // 4. Minimalist: few categories, low total, low txPerDay
  const minimalistScore = (uniqueCats <= 3 ? 2 : 0) + (txPerDay < 0.8 ? 1 : 0) + (avgAmount < 300 ? 1 : 0);

  // 5. Comfort: Food + Shopping dominates > 50% of spend
  const comfortCats = ['Food', 'Shopping', 'Games', 'Subscriptions'];
  const comfortSpend = expenses.filter((t) => comfortCats.includes(t.category)).reduce((s, t) => s + Number(t.amount), 0);
  const comfortScore = totalExp > 0 && (comfortSpend / totalExp) > 0.5 ? 3 : (comfortSpend / totalExp) > 0.35 ? 1 : 0;

  // 6. Social: Entertainment + Food (outside) + Transportation high, many weekend txs
  const weekendTx = expenses.filter((t) => {
    const dow = toPHDate(t.created_at).getDay();
    return dow === 0 || dow === 6;
  }).length;
  const socialScore = (weekendTx / Math.max(expenses.length, 1)) > 0.4 ? 3 : 0;

  // 7. Anxious: balance < 1000, spending > income
  const balance = totalInc - totalExp;
  const anxiousScore = (balance < 500 ? 3 : balance < 1000 ? 1 : 0) + (spendingRatio > 1.1 ? 2 : 0);

  const scores = {
    impulsive:  impulsiveScore,
    planner:    plannerScore,
    saver:      saverScore,
    minimalist: minimalistScore,
    comfort:    comfortScore,
    social:     socialScore,
    anxious:    anxiousScore,
  };

  // Pick the highest scorer
  const top = Object.entries(scores).sort((a, b) => b[1] - a[1])[0];
  if (top[1] === 0) return PERSONALITIES.planner; // default fallback

  return PERSONALITIES[top[0]];
}
